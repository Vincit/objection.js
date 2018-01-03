'use strict';

const uniq = require('lodash/uniq');
const uniqBy = require('lodash/uniqBy');
const values = require('lodash/values');
const groupBy = require('lodash/groupBy');
const uniqWith = require('lodash/uniqWith');
const Promise = require('bluebird');

const ID_LENGTH_LIMIT = 63;
const RELATION_RECURSION_LIMIT = 64;

class RelationJoinBuilder {
  constructor(args) {
    this.rootModelClass = args.modelClass;
    this.expression = args.expression;
    this.allRelations = null;

    this.pathInfo = Object.create(null);
    this.encodings = Object.create(null);
    this.decodings = Object.create(null);
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
    const columnInfo = RelationJoinBuilder.columnInfo;
    const allModelClasses = findAllModels(this.expression, this.rootModelClass);

    return Promise.map(
      allModelClasses,
      ModelClass => {
        const table = builder.tableNameFor(ModelClass);

        if (columnInfo[table]) {
          return columnInfo[table];
        } else {
          columnInfo[table] = ModelClass.query()
            .childQueryOf(builder)
            .columnInfo()
            .then(info => {
              const result = {
                columns: Object.keys(info)
              };

              columnInfo[table] = result;
              return result;
            });

          return columnInfo[table];
        }
      },
      {concurrency: this.rootModelClass.concurrency}
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
    const builderClone = builder.clone();
    const tableName = builder.tableNameFor(this.rootModelClass);
    const tableAlias = builder.tableRefFor(this.rootModelClass);

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
      parentInfo: null,
      relation: null,
      path: '',
      selectFilter: col => {
        return builderClone.hasSelection(col);
      }
    });
  }

  rowsToTree(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return rows;
    }

    const keyInfoByPath = this.createKeyInfo(rows);
    const pathInfo = values(this.pathInfo);

    const tree = Object.create(null);
    const stack = Object.create(null);

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
          const parentModel = stack[pInfo.encParentPath];

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

        stack[pInfo.encPath] = model;
      }
    }

    return this.finalize(pathInfo[0], values(tree));
  }

  createKeyInfo(rows) {
    const keys = Object.keys(rows[0]);
    const keyInfo = [];

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const sepIdx = key.lastIndexOf(this.sep);

      if (sepIdx === -1) {
        const pInfo = this.pathInfo[''];
        const col = key;

        if (!pInfo.omitCols[col]) {
          keyInfo.push({pInfo, key, col});
        }
      } else {
        const encPath = key.substr(0, sepIdx);
        const path = this.decode(encPath);
        const col = key.substr(sepIdx + this.sep.length);
        const pInfo = this.pathInfo[path];

        if (!pInfo.omitCols[col]) {
          keyInfo.push({pInfo, key, col});
        }
      }
    }

    return groupBy(keyInfo, kInfo => kInfo.pInfo.encPath);
  }

  finalize(pInfo, models) {
    const relNames = Object.keys(pInfo.children);

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
      const childPathInfo = pInfo.children[relName];

      const finalized = childPathInfo.finalizeBranch(branch, model);
      this.finalize(childPathInfo, finalized);
    }
  }

  doBuild(args) {
    const expr = args.expr;
    const builder = args.builder;
    const selectFilter = args.selectFilter;
    const modelClass = args.modelClass;
    const relation = args.relation;
    const path = args.path;
    const parentInfo = args.parentInfo;
    const joinOperation = args.joinOperation;
    const noSelects = args.noSelects;

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

    this.pathInfo[path] = info;

    if (!noSelects) {
      this.buildSelects({
        builder,
        selectFilter,
        modelClass,
        relation,
        info
      });
    }

    forEachExpr(expr, modelClass, (childExpr, relation) => {
      const nextPath = this.joinPath(path, childExpr.alias);
      const encNextPath = this.encode(nextPath);
      const encJoinTablePath = relation.joinTable ? this.encode(joinTableForPath(nextPath)) : null;

      const filterQuery = createFilterQuery({
        builder,
        modelClass,
        relation,
        expr: childExpr
      });

      const relatedJoinSelectQuery = createRelatedJoinFromQuery({
        filterQuery,
        relation,
        allRelations: this.allRelations
      });

      relation.join(builder, {
        joinOperation,
        ownerTable: info.encPath,
        relatedTableAlias: encNextPath,
        joinTableAlias: encJoinTablePath,
        relatedJoinSelectQuery
      });

      // Apply relation.modify since it may also contains selections. Don't move this
      // to the createFilterQuery function because relatedJoinSelectQuery is cloned
      // from the return value of that function and we don't want relation.modify
      // to be called twice for it.
      filterQuery.modify(relation.modify);

      this.doBuild({
        expr: childExpr,
        builder,
        modelClass: relation.relatedModelClass,
        joinOperation,
        relation,
        parentInfo: info,
        noSelects,
        path: nextPath,
        selectFilter: col => {
          return filterQuery.hasSelection(col);
        }
      });
    });
  }

  createPathInfo(args) {
    const modelClass = args.modelClass;
    const path = args.path;
    const expr = args.expr;
    const relation = args.relation;
    const parentInfo = args.parentInfo;
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
    info.relationAlias = expr.alias;

    if (parentInfo) {
      parentInfo.children[expr.alias] = info;
    }

    return info;
  }

  buildSelects(args) {
    const builder = args.builder;
    const selectFilter = args.selectFilter;
    const modelClass = args.modelClass;
    const relation = args.relation;
    const info = args.info;
    const selects = [];
    const idCols = modelClass.getIdColumnArray();
    const rootTable = builder.tableRefFor(this.rootModelClass);
    const table = builder.tableNameFor(modelClass);
    const columns = RelationJoinBuilder.columnInfo[table].columns;

    for (let i = 0, l = columns.length; i < l; ++i) {
      const col = columns[i];
      const filterPassed = selectFilter(col);
      // This needs to be var instead of let or const to prevent an optimization
      // bailout because of "Unsupported phi use of const or let variable".
      var isIdColumn = idCols.indexOf(col) !== -1;

      if (filterPassed || isIdColumn) {
        const fullCol = `${info.encPath || rootTable}.${col}`;

        if (!builder.hasSelection(fullCol, true)) {
          const alias = this.joinPath(info.encPath, col);

          if (alias.length > ID_LENGTH_LIMIT) {
            throw modelClass.createValidationError({
              eager: `identifier ${alias} is over ${ID_LENGTH_LIMIT} characters long and would be truncated by the database engine.`
            });
          }

          selects.push(`${fullCol} as ${alias}`);
        }

        if (!filterPassed) {
          info.omitCols[col] = true;
        }
      }
    }

    if (relation && relation.joinTableExtras) {
      const joinTable = this.encode(joinTableForPath(info.path));

      for (let i = 0, l = relation.joinTableExtras.length; i < l; ++i) {
        const extra = relation.joinTableExtras[i];
        const filterPassed = selectFilter(extra.joinTableCol);

        if (filterPassed) {
          const fullCol = `${joinTable}.${extra.joinTableCol}`;

          if (!builder.hasSelection(fullCol, true)) {
            const alias = this.joinPath(info.encPath, extra.aliasCol);

            if (alias.length > ID_LENGTH_LIMIT) {
              throw modelClass.createValidationError({
                eager: `identifier ${alias} is over ${ID_LENGTH_LIMIT} characters long and would be truncated by the database engine.`
              });
            }

            selects.push(`${fullCol} as ${alias}`);
          }
        }
      }
    }

    builder.select(selects);
  }

  encode(path) {
    if (!this.opt.minimize) {
      let encPath = this.encodings[path];

      if (!encPath) {
        const parts = path.split(this.sep);

        // Don't encode the root.
        if (!path) {
          encPath = path;
        } else {
          encPath = parts.map(part => this.opt.aliases[part] || part).join(this.sep);
        }

        this.encodings[path] = encPath;
        this.decodings[encPath] = path;
      }

      return encPath;
    } else {
      let encPath = this.encodings[path];

      if (!encPath) {
        // Don't encode the root.
        if (!path) {
          encPath = path;
        } else {
          encPath = this.nextEncodedPath();
        }

        this.encodings[path] = encPath;
        this.decodings[encPath] = path;
      }

      return encPath;
    }
  }

  decode(path) {
    return this.decodings[path];
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
  const models = [];

  findAllModelsImpl(expr, modelClass, models);

  return uniqBy(models, getTableName);
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

  return uniqWith(relations, strictEqual);
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

  if (expr.isAllRecursive() || expr.maxRecursionDepth() > RELATION_RECURSION_LIMIT) {
    throw modelClass.createValidationError({
      eager: `recursion depth of eager expression ${expr.toString()} too big for JoinEagerAlgorithm`
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

function createFilterQuery(args) {
  const builder = args.builder;
  const modelClass = args.modelClass;
  const expr = args.expr;
  const relation = args.relation;
  const modelNamedFilters = relation.relatedModelClass.namedFilters || {};
  const filterQuery = relation.relatedModelClass.query().childQueryOf(builder);

  for (let i = 0, l = expr.args.length; i < l; ++i) {
    const filterName = expr.args[i];
    const filter = expr.filters[filterName] || modelNamedFilters[filterName];

    if (typeof filter !== 'function') {
      throw modelClass.createValidationError({
        eager: `could not find filter "${filterName}" for relation "${relation.name}"`
      });
    }

    filter(filterQuery);
  }

  return filterQuery;
}

function createRelatedJoinFromQuery(args) {
  const filterQuery = args.filterQuery;
  const relation = args.relation;
  const allRelations = args.allRelations;
  const relatedJoinFromQuery = filterQuery.clone();

  const allForeignKeys = findAllForeignKeysForModel({
    modelClass: relation.relatedModelClass,
    allRelations
  });

  return relatedJoinFromQuery.select(
    allForeignKeys.filter(col => {
      return !relatedJoinFromQuery.hasSelectionAs(col, col);
    })
  );
}

function findAllForeignKeysForModel(args) {
  const modelClass = args.modelClass;
  const allRelations = args.allRelations;
  const foreignKeys = modelClass.getIdColumnArray().slice();

  allRelations.forEach(rel => {
    if (rel.relatedModelClass === modelClass) {
      rel.relatedProp.cols.forEach(col => foreignKeys.push(col));
    }

    if (rel.ownerModelClass === modelClass) {
      rel.ownerProp.cols.forEach(col => foreignKeys.push(col));
    }
  });

  return uniq(foreignKeys);
}

function createModel(row, pInfo, keyInfoByPath) {
  const keyInfo = keyInfoByPath[pInfo.encPath];
  const json = {};

  for (let k = 0, lk = keyInfo.length; k < lk; ++k) {
    const kInfo = keyInfo[k];
    json[kInfo.col] = row[kInfo.key];
  }

  return pInfo.modelClass.fromDatabaseJson(json);
}

function joinTableForPath(path) {
  return path + '_join';
}

class PathInfo {
  constructor() {
    this.path = null;
    this.encPath = null;
    this.encParentPath = null;
    this.modelClass = null;
    this.relation = null;
    this.omitCols = Object.create(null);
    this.children = Object.create(null);
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

RelationJoinBuilder.columnInfo = Object.create(null);

module.exports = RelationJoinBuilder;
