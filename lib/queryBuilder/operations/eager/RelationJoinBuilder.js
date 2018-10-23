const promiseUtils = require('../../../utils/promiseUtils');
const Selection = require('../select/Selection');

const { uniqBy, values } = require('../../../utils/objectUtils');
const { Type: ValidationErrorType } = require('../../../model/ValidationError');
const { createModifier } = require('../../../utils/createModifier');

const ID_LENGTH_LIMIT = 63;
const RELATION_RECURSION_LIMIT = 64;

class RelationJoinBuilder {
  constructor({ modelClass, expression, modifiers = Object.create(null) }) {
    this.rootModelClass = modelClass;
    this.expression = expression;
    this.modifiers = modifiers;
    this.allRelations = null;

    this.pathInfo = new Map();
    this.encodings = new Map();
    this.decodings = new Map();
    this.encIdx = 0;
    this.opt = {
      minimize: false,
      separator: ':',
      aliases: {}
    };
  }

  setOptions(opt) {
    this.opt = Object.assign(this.opt, opt);
  }

  /**
   * Fetches the column information needed for building the select clauses.
   * This must be called before calling `build`. `buildJoinOnly` can be called
   * without this since it doesn't build selects.
   */
  fetchColumnInfo(builder) {
    const allModelClasses = findAllModels(this.expression, this.rootModelClass);

    return promiseUtils.map(
      allModelClasses,
      modelClass => modelClass.fetchTableMetadata({ parentBuilder: builder }),
      {
        concurrency: this.rootModelClass.getConcurrency(builder.unsafeKnex())
      }
    );
  }

  buildJoinOnly(builder) {
    this.doBuild({
      expr: this.expression,
      builder,
      modelClass: builder.modelClass(),
      joinOperation: this.opt.joinOperation || 'leftJoin',
      parentInfo: null,
      relation: null,
      noSelects: true,
      path: ''
    });
  }

  build(builder) {
    const tableName = builder.tableNameFor(this.rootModelClass.getTableName());
    const tableAlias = builder.tableRefFor(this.rootModelClass.getTableName());

    if (tableName === tableAlias) {
      builder.table(tableName);
    } else {
      builder.table(`${tableName} as ${tableAlias}`);
    }

    this.doBuild({
      expr: this.expression,
      builder,
      modelClass: builder.modelClass(),
      joinOperation: this.opt.joinOperation || 'leftJoin',
      selectFilterQuery: builder.clone(),
      parentInfo: null,
      relation: null,
      path: ''
    });
  }

  rowsToTree(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return rows;
    }

    const keyInfoByPath = this.createKeyInfo(rows);
    const pathInfo = Array.from(this.pathInfo.values());

    const tree = Object.create(null);
    const stack = new Map();

    for (let i = 0, lr = rows.length; i < lr; ++i) {
      const row = rows[i];
      let curBranch = tree;

      for (let j = 0, lp = pathInfo.length; j < lp; ++j) {
        const pInfo = pathInfo[j];
        const id = pInfo.idGetter(row);
        let model;

        if (id === null) {
          continue;
        }

        if (pInfo.relation) {
          const parentModel = stack.get(pInfo.encParentPath);

          curBranch = pInfo.getBranch(parentModel);

          if (!curBranch) {
            curBranch = pInfo.createBranch(parentModel);
          }
        }

        model = pInfo.getModelFromBranch(curBranch, id);

        if (!model) {
          model = createModel(row, pInfo, keyInfoByPath);
          pInfo.setModelToBranch(curBranch, id, model);
        }

        stack.set(pInfo.encPath, model);
      }
    }

    return this.finalize(pathInfo[0], values(tree));
  }

  createKeyInfo(rows) {
    const keys = Object.keys(rows[0]);
    const keyInfo = new Map();

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const sepIdx = key.lastIndexOf(this.sep);
      let col, pInfo;

      if (sepIdx === -1) {
        pInfo = this.pathInfo.get('');
        col = key;
      } else {
        const encPath = key.substr(0, sepIdx);
        const path = this.decode(encPath);

        col = key.substr(sepIdx + this.sep.length);
        pInfo = this.pathInfo.get(path);
      }

      if (!pInfo.omitCols.has(col)) {
        let infoArr = keyInfo.get(pInfo.encPath);

        if (!infoArr) {
          infoArr = [];
          keyInfo.set(pInfo.encPath, infoArr);
        }

        infoArr.push({ pInfo, key, col });
      }
    }

    return keyInfo;
  }

  finalize(pInfo, models) {
    const relNames = Array.from(pInfo.children.keys());

    if (Array.isArray(models)) {
      for (let m = 0, lm = models.length; m < lm; ++m) {
        this.finalizeOne(pInfo, relNames, models[m]);
      }
    } else if (models) {
      this.finalizeOne(pInfo, relNames, models);
    }

    return models;
  }

  finalizeOne(pInfo, relNames, model) {
    for (let r = 0, lr = relNames.length; r < lr; ++r) {
      const relName = relNames[r];
      const branch = model[relName];
      const childPathInfo = pInfo.children.get(relName);

      const finalized = childPathInfo.finalizeBranch(branch, model);
      this.finalize(childPathInfo, finalized);
    }
  }

  doBuild({
    expr,
    builder,
    relation,
    modelClass,
    selectFilterQuery,
    joinOperation,
    parentInfo,
    noSelects,
    path
  }) {
    if (!this.allRelations) {
      this.allRelations = findAllRelations(this.expression, this.rootModelClass);
    }

    const info = this.createPathInfo({
      modelClass,
      path,
      expr,
      relation,
      parentInfo
    });

    this.pathInfo.set(path, info);

    if (!noSelects) {
      this.buildSelects({
        builder,
        selectFilterQuery,
        modelClass,
        relation,
        info
      });
    }

    forEachExpr(expr, modelClass, (childExpr, relation) => {
      const nextPath = this.joinPath(path, childExpr.$name);
      const encNextPath = this.encode(nextPath);
      const encJoinTablePath = relation.joinTable
        ? this.encode(modelClass.joinTableAlias(nextPath))
        : null;
      const ownerTable = info.encPath || undefined;

      const modifierQuery = createModifierQuery({
        builder,
        modelClass,
        relation,
        expr: childExpr,
        modifiers: this.modifiers
      });

      const relatedJoinSelectQuery = createRelatedJoinFromQuery({
        modifierQuery,
        relation,
        allRelations: this.allRelations
      });

      relation.join(builder, {
        ownerTable,
        joinOperation,
        relatedTableAlias: encNextPath,
        joinTableAlias: encJoinTablePath,
        relatedJoinSelectQuery
      });

      // Apply relation.modify since it may also contains selections. Don't move this
      // to the createModifierQuery function because relatedJoinSelectQuery is cloned
      // from the return value of that function and we don't want relation.modify
      // to be called twice for it.
      modifierQuery.modify(relation.modify);

      this.doBuild({
        expr: childExpr,
        builder,
        modelClass: relation.relatedModelClass,
        joinOperation,
        relation,
        parentInfo: info,
        noSelects,
        path: nextPath,
        selectFilterQuery: modifierQuery
      });
    });
  }

  createPathInfo({ modelClass, path, expr, relation, parentInfo }) {
    const encPath = this.encode(path);
    let info;

    if (relation && relation.isOneToOne()) {
      info = new OneToOnePathInfo();
    } else {
      info = new PathInfo();
    }

    info.path = path;
    info.encPath = encPath;
    info.parentPath = parentInfo && parentInfo.path;
    info.encParentPath = parentInfo && parentInfo.encPath;
    info.modelClass = modelClass;
    info.relation = relation;
    info.idGetter = this.createIdGetter(modelClass, encPath);
    info.relationAlias = expr.$name;

    if (parentInfo) {
      parentInfo.children.set(expr.$name, info);
    }

    return info;
  }

  buildSelects({ builder, selectFilterQuery, modelClass, relation, info }) {
    const selects = [];
    const idCols = modelClass.getIdColumnArray();
    const rootTable = builder.tableRefFor(this.rootModelClass.getTableName());
    const isSelectFilterQuerySubQuery = !!info.encPath;

    let selections = selectFilterQuery.findAllSelections();
    const selectAllIndex = selections.findIndex(isSelectAll);

    // If there are no explicit selects, or there is a `select *` item,
    // we need to select all columns using the schema information
    // in `modelClass.tableMetadata()`.
    if (selections.length === 0 || selectAllIndex !== -1) {
      const table = builder.tableNameFor(modelClass.getTableName());

      selections.splice(selectAllIndex, 1);
      selections = modelClass
        .tableMetadata({ table })
        .columns.map(it => new Selection(null, it))
        .concat(selections);
    }

    // Id columns always need to be selected so that we are able to construct
    // the tree structure from the flat columns.
    for (let i = 0, l = idCols.length; i < l; ++i) {
      const idCol = idCols[i];

      if (!selections.some(it => it.name === idCol)) {
        info.omitCols.add(idCol);
        selections.unshift(new Selection(null, idCol));
      }
    }

    for (let i = 0, l = selections.length; i < l; ++i) {
      const selection = selections[i];

      // If `selections` come from a subquery, we need to use the possible alias instead
      // of the column name because that's what the root query sees instead of the real
      // column name.
      const col = isSelectFilterQuerySubQuery ? selection.name : selection.column;
      const name = selection.name;

      const fullCol = `${info.encPath || rootTable}.${col}`;
      const alias = this.joinPath(info.encPath, name);

      if (!builder.hasSelectionAs(fullCol, alias, true)) {
        checkAliasLength(modelClass, alias);
        selects.push(`${fullCol} as ${alias}`);
      }
    }

    if (relation && relation.joinTableExtras) {
      const joinTable = this.encode(modelClass.joinTableAlias(info.path));

      for (let i = 0, l = relation.joinTableExtras.length; i < l; ++i) {
        const extra = relation.joinTableExtras[i];
        const filterPassed = selectFilterQuery.hasSelection(extra.joinTableCol);

        if (filterPassed) {
          const fullCol = `${joinTable}.${extra.joinTableCol}`;

          if (!builder.hasSelection(fullCol, true)) {
            const alias = this.joinPath(info.encPath, extra.aliasCol);
            checkAliasLength(modelClass, alias);
            selects.push(`${fullCol} as ${alias}`);
          }
        }
      }
    }

    builder.select(selects);
  }

  encode(path) {
    if (!this.opt.minimize) {
      let encPath = this.encodings.get(path);

      if (!encPath) {
        const parts = path.split(this.sep);

        // Don't encode the root.
        if (!path) {
          encPath = path;
        } else {
          encPath = parts.map(part => this.opt.aliases[part] || part).join(this.sep);
        }

        this.encodings.set(path, encPath);
        this.decodings.set(encPath, path);
      }

      return encPath;
    } else {
      let encPath = this.encodings.get(path);

      if (!encPath) {
        // Don't encode the root.
        if (!path) {
          encPath = path;
        } else {
          encPath = this.nextEncodedPath();
        }

        this.encodings.set(path, encPath);
        this.decodings.set(encPath, path);
      }

      return encPath;
    }
  }

  decode(path) {
    return this.decodings.get(path);
  }

  nextEncodedPath() {
    return `_t${++this.encIdx}`;
  }

  createIdGetter(modelClass, path) {
    const idCols = modelClass.getIdColumnArray().map(col => this.joinPath(path, col));

    if (idCols.length === 1) {
      return createSingleIdGetter(idCols);
    } else if (idCols.length === 2) {
      return createTwoIdGetter(idCols);
    } else if (idCols.length === 3) {
      return createThreeIdGetter(idCols);
    } else {
      return createNIdGetter(idCols);
    }
  }

  get sep() {
    return this.opt.separator;
  }

  joinPath(path, nextPart) {
    if (path) {
      return `${path}${this.sep}${nextPart}`;
    } else {
      return nextPart;
    }
  }
}

function findAllModels(expr, modelClass) {
  const modelClasses = [];

  findAllModelsImpl(expr, modelClass, modelClasses);

  return uniqBy(modelClasses, getTableName);
}

function getTableName(modelClass) {
  return modelClass.getTableName();
}

function findAllModelsImpl(expr, modelClass, models) {
  models.push(modelClass);

  forEachExpr(expr, modelClass, (childExpr, relation) => {
    findAllModelsImpl(childExpr, relation.relatedModelClass, models);
  });
}

function findAllRelations(expr, modelClass) {
  const relations = [];

  findAllRelationsImpl(expr, modelClass, relations);

  return uniqBy(relations);
}

function strictEqual(lhs, rhs) {
  return lhs === rhs;
}

function findAllRelationsImpl(expr, modelClass, relations) {
  forEachExpr(expr, modelClass, (childExpr, relation) => {
    relations.push(relation);

    findAllRelationsImpl(childExpr, relation.relatedModelClass, relations);
  });
}

function forEachExpr(expr, modelClass, callback) {
  const relations = modelClass.getRelations();

  if (expr.isAllRecursive || expr.maxRecursionDepth > RELATION_RECURSION_LIMIT) {
    throw modelClass.createValidationError({
      type: ValidationErrorType.RelationExpression,
      message: `recursion depth of eager expression ${expr.toString()} too big for JoinEagerAlgorithm`
    });
  }

  expr.forEachChildExpression(relations, callback);
}

function createSingleIdGetter(idCols) {
  const idCol = idCols[0];

  return row => {
    const val = row[idCol];

    if (isNullOrUndefined(val)) {
      return null;
    } else {
      return `id:${val}`;
    }
  };
}

function createTwoIdGetter(idCols) {
  const idCol1 = idCols[0];
  const idCol2 = idCols[1];

  return row => {
    const val1 = row[idCol1];
    const val2 = row[idCol2];

    if (isNullOrUndefined(val1) || isNullOrUndefined(val2)) {
      return null;
    } else {
      return `id:${val1},${val2}`;
    }
  };
}

function createThreeIdGetter(idCols) {
  const idCol1 = idCols[0];
  const idCol2 = idCols[1];
  const idCol3 = idCols[2];

  return row => {
    const val1 = row[idCol1];
    const val2 = row[idCol2];
    const val3 = row[idCol3];

    if (isNullOrUndefined(val1) || isNullOrUndefined(val2) || isNullOrUndefined(val3)) {
      return null;
    } else {
      return `id:${val1},${val2},${val3}`;
    }
  };
}

function createNIdGetter(idCols) {
  return row => {
    let id = 'id:';

    for (let i = 0, l = idCols.length; i < l; ++i) {
      const val = row[idCols[i]];

      if (isNullOrUndefined(val)) {
        return null;
      }

      id += (i > 0 ? ',' : '') + val;
    }

    return id;
  };
}

function isNullOrUndefined(val) {
  return val === null || val === undefined;
}

function createModifierQuery({ builder, modelClass, expr, modifiers, relation }) {
  const modifierQuery = relation.relatedModelClass.query().childQueryOf(builder);

  for (let i = 0, l = expr.$modify.length; i < l; ++i) {
    const modifierName = expr.$modify[i];
    const modifier = createModifier({
      modifier: modifierName,
      modelClass: relation.relatedModelClass,
      modifiers
    });

    try {
      modifier(modifierQuery);
    } catch (err) {
      if (err instanceof modelClass.ModifierNotFoundError) {
        throw modelClass.createValidationError({
          type: ValidationErrorType.RelationExpression,
          message: `could not find modifier "${modifierName}" for relation "${relation.name}"`
        });
      } else {
        throw err;
      }
    }
  }

  return modifierQuery;
}

function createRelatedJoinFromQuery({ modifierQuery, relation, allRelations }) {
  const relatedJoinFromQuery = modifierQuery.clone();
  const tableRef = modifierQuery.tableRefFor(relation.relatedModelClass.getTableName());

  const allForeignKeys = findAllForeignKeysForModel({
    modelClass: relation.relatedModelClass,
    allRelations
  });

  return relatedJoinFromQuery.select(
    allForeignKeys
      .filter(col => {
        return !relatedJoinFromQuery.hasSelectionAs(col, col);
      })
      .map(col => {
        return `${tableRef}.${col}`;
      })
  );
}

function findAllForeignKeysForModel({ modelClass, allRelations }) {
  const foreignKeys = modelClass.getIdColumnArray().slice();

  allRelations.forEach(rel => {
    if (rel.relatedModelClass === modelClass) {
      rel.relatedProp.cols.forEach(col => foreignKeys.push(col));
    }

    if (rel.ownerModelClass === modelClass) {
      rel.ownerProp.cols.forEach(col => foreignKeys.push(col));
    }
  });

  return uniqBy(foreignKeys);
}

function createModel(row, pInfo, keyInfoByPath) {
  const keyInfo = keyInfoByPath.get(pInfo.encPath);
  const json = {};

  for (let k = 0, lk = keyInfo.length; k < lk; ++k) {
    const kInfo = keyInfo[k];
    json[kInfo.col] = row[kInfo.key];
  }

  return pInfo.modelClass.fromDatabaseJson(json);
}

function checkAliasLength(modelClass, alias) {
  if (alias.length > ID_LENGTH_LIMIT) {
    throw modelClass.createValidationError({
      type: ValidationErrorType.RelationExpression,
      message: `identifier ${alias} is over ${ID_LENGTH_LIMIT} characters long and would be truncated by the database engine.`
    });
  }
}

function isSelectAll(selection) {
  return selection.column === '*';
}

class PathInfo {
  constructor() {
    this.path = null;
    this.encPath = null;
    this.encParentPath = null;
    this.modelClass = null;
    this.relation = null;
    this.omitCols = new Set();
    this.children = new Map();
    this.idGetter = null;
    this.relationAlias = null;
  }

  createBranch(parentModel) {
    const branch = Object.create(null);
    parentModel[this.relationAlias] = branch;
    return branch;
  }

  getBranch(parentModel) {
    return parentModel[this.relationAlias];
  }

  getModelFromBranch(branch, id) {
    return branch[id];
  }

  setModelToBranch(branch, id, model) {
    branch[id] = model;
  }

  finalizeBranch(branch, parentModel) {
    const relModels = values(branch);
    parentModel[this.relationAlias] = relModels;
    return relModels;
  }
}

class OneToOnePathInfo extends PathInfo {
  createBranch(parentModel) {
    return parentModel;
  }

  getBranch(parentModel) {
    return parentModel;
  }

  getModelFromBranch(branch, id) {
    return branch[this.relationAlias];
  }

  setModelToBranch(branch, id, model) {
    branch[this.relationAlias] = model;
  }

  finalizeBranch(branch, parentModel) {
    parentModel[this.relationAlias] = branch || null;
    return branch || null;
  }
}

module.exports = RelationJoinBuilder;
