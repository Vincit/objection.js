import _ from 'lodash';
import Promise from 'bluebird';
import EagerOperation from './EagerOperation';
import ValidationError from '../../ValidationError';

import HasOneRelation from '../../relations/hasOne/HasOneRelation';
import ManyToManyRelation from '../../relations/manyToMany/ManyToManyRelation';
import BelongsToOneRelation from '../../relations/belongsToOne/BelongsToOneRelation';

const columnInfo = Object.create(null);

export default class JoinEagerOperation extends EagerOperation {

  constructor(knex, name, opt) {
    super(knex, name, opt);

    this.allRelations = null;
    this.pathInfo = Object.create(null);
    this.encodings = Object.create(null);
    this.decodings = Object.create(null);
    this.encIdx = 0;
    this.opt = _.defaults(opt, {
      minimize: true,
      separator: ':'
    });
  }

  clone() {
    const copy = super.clone();

    copy.allRelations = this.allRelations;
    copy.allModelClasses = this.allModelClasses;
    copy.pathInfo = this.pathInfo;
    copy.encodings = this.encodings;
    copy.decodings = this.decodings;
    copy.encIdx = this.encIdx;

    return this;
  }

  call(builder, args) {
    const ret = super.call(builder, args);
    const ModelClass = builder.modelClass();

    if (ret) {
      this.allModelClasses = findAllModels(this.expression, ModelClass);
      this.allRelations = findAllRelations(this.expression, ModelClass);
    }

    return ret;
  }

  onBeforeInternal(builder) {
    return fetchColumnInfo(builder, this.allModelClasses);
  }

  onBeforeBuild(builder) {
    const builderClone = builder.clone();
    const rootTable = builder.modelClass().tableName;

    builder.table(`${rootTable} as ${rootTable}`);
    builder.findOptions({callAfterGetDeeply: true});

    this.buildForLevel({
      expr: this.expression,
      builder: builder,
      modelClass: builder.modelClass(),
      parentInfo: null,
      relation: null,
      path: rootTable,
      selectFilter: (col) => {
        return builderClone.hasSelection(col);
      }
    });
  }

  onRawResult(builder, rows) {
    if (_.isEmpty(rows)) {
      return rows;
    }

    const keyInfoByPath = this.createKeyInfo(builder.modelClass(), rows);
    const pathInfo = _.values(this.pathInfo);

    const tree = Object.create(null);
    const stack = Object.create(null);

    for (let i = 0, lr = rows.length; i < lr; ++i) {
      const row = rows[i];
      let curBranch = tree;

      for (let j = 0, lp = pathInfo.length; j < lp; ++j) {
        const pInfo = pathInfo[j];
        const id = pInfo.idGetter(row);

        if (!id) {
          break;
        }

        if (pInfo.relation) {
          const parentModel = stack[pInfo.encParentPath];

          curBranch = pInfo.getBranch(parentModel);

          if (!curBranch) {
            curBranch = pInfo.createBranch(parentModel);
          }
        }

        let model = pInfo.getModelFromBranch(curBranch, id);

        if (!model) {
          model = createModel(row, pInfo, keyInfoByPath);
          pInfo.setModelToBranch(curBranch, id, model);
        }

        stack[pInfo.encPath] = model;
      }
    }

    return this.finalize(pathInfo[0], _.values(tree));
  }

  createKeyInfo(modelClass, rows) {
    const rootPath = modelClass.tableName;
    const keys = Object.keys(rows[0]);
    const keyInfo = [];

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const sepIdx = key.lastIndexOf(this.sep);

      if (sepIdx === -1) {
        const pInfo = this.pathInfo[rootPath];
        const col = key;

        if (!pInfo.omitCols[col]) {
          keyInfo.push({
            pInfo: pInfo,
            key: key,
            col: col
          });
        }
      } else {
        const encPath = key.substr(0, sepIdx);
        const path = this.decode(encPath);
        const col = key.substr(sepIdx + 1);
        const pInfo = this.pathInfo[path];

        if (!pInfo.omitCols[col]) {
          keyInfo.push({
            pInfo: pInfo,
            key: key,
            col: col
          });
        }
      }
    }

    return _.groupBy(keyInfo, kInfo => kInfo.pInfo.encPath);
  }

  finalize(pInfo, models) {
    const relNames = Object.keys(pInfo.children);

    if (Array.isArray(models)) {
      for (let m = 0, lm = models.length; m < lm; ++m) {
        this.finalizeOne(pInfo, relNames, models[m]);
      }
    } else {
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

  buildForLevel({expr, builder, selectFilter, modelClass, relation, path, parentInfo}) {
    const info = this.createPathInfo({
      modelClass,
      path,
      relation,
      parentInfo
    });

    this.pathInfo[path] = info;

    this.buildSelects({
      builder,
      selectFilter,
      modelClass,
      relation,
      info
    });

    forEachExpr(expr, modelClass, (childExpr, relation, relName) => {
      const nextPath = `${path}${this.sep}${relName}`;
      const encNextPath = this.encode(nextPath);
      const encJoinTablePath = this.encode(joinTableForPath(nextPath));

      const filterQuery = createFilterQuery({
        builder,
        relation,
        expr: childExpr
      });

      const relatedJoinSelectQuery = createRelatedJoinFromQuery({
        filterQuery,
        relation,
        allRelations: this.allRelations
      });

      relation.join(builder, {
        joinOperation: 'leftJoin',
        ownerTable: info.encPath,
        relatedTableAlias: encNextPath,
        joinTableAlias: encJoinTablePath,
        relatedJoinSelectQuery: relatedJoinSelectQuery
      });

      // Apply relation.modify since it may also contains selections. Don't move this
      // to the createFilterQuery function because relatedJoinSelectQuery is cloned
      // From the return value of that function and we don't want relation.modify
      // to be called twice for it.
      filterQuery.modify(relation.modify);

      this.buildForLevel({
        expr: childExpr,
        builder: builder,
        modelClass: relation.relatedModelClass,
        relation: relation,
        parentInfo: info,
        path: nextPath,
        selectFilter: (col) => {
          return filterQuery.hasSelection(col);
        }
      });
    });
  }

  createPathInfo({modelClass, path, relation, parentInfo}) {
    const encPath = this.encode(path);
    let info;

    if (relation instanceof HasOneRelation || relation instanceof BelongsToOneRelation) {
      info = new OneToOnePathInfo();
    } else {
      info = new PathInfo();
    }

    const pathParts = path.split(this.sep);
    const parentPath = pathParts.slice(0, pathParts.length - 1).join(this.sep);
    const encParentPath = this.encode(parentPath);

    info.path = path;
    info.encPath = encPath;
    info.parentPath = parentPath;
    info.encParentPath = encParentPath;
    info.modelClass = modelClass;
    info.relation = relation;
    info.idGetter = this.createIdGetter(modelClass, encPath);

    if (parentInfo) {
      parentInfo.children[relation.name] = info;
    }

    return info;
  }

  buildSelects({builder, selectFilter, modelClass, relation, info}) {
    const selects = [];
    const idCols = modelClass.getIdColumnArray();

    columnInfo[modelClass.tableName].columns.forEach(col => {
      const filterPassed = selectFilter(col);
      const isIdColumn = idCols.indexOf(col) !== -1;

      if (filterPassed || isIdColumn) {
        selects.push(`${info.encPath}.${col} as ${info.encPath}${this.sep}${col}`);

        if (!filterPassed) {
          info.omitCols[col] = true;
        }
      }
    });

    if (relation instanceof ManyToManyRelation) {
      const joinTable = this.encode(joinTableForPath(info.path));

      relation.joinTableExtraCols.forEach(col => {
        if (selectFilter(col)) {
          selects.push(`${joinTable}.${col} as ${info.encPath}${this.sep}${col}`);
        }
      });
    }

    builder.select(selects);
  }

  encode(path) {
    if (!this.opt.minimize) {
      return path;
    } else {
      let encPath = this.encodings[path];

      if (!encPath) {
        // Don't encode the root.
        if (path.indexOf(this.sep) === -1) {
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
    if (!this.opt.minimize) {
      return path;
    } else {
      return this.decodings[path];
    }
  }

  nextEncodedPath() {
    return `_t${++this.encIdx}`;
  }

  createIdGetter(modelClass, path) {
    const idCols = modelClass.getIdColumnArray().map(col => `${path}${this.sep}${col}`);

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
}

function findAllModels(expr, modelClass) {
  const models = [];

  findAllModelsImpl(expr, modelClass, models);

  return _.uniqBy(models, 'tableName');
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

  return _.uniqWith(relations, (lhs, rhs) => lhs === rhs);
}

function findAllRelationsImpl(expr, modelClass, relations) {
  forEachExpr(expr, modelClass, (childExpr, relation) => {
    relations.push(relation);

    findAllRelationsImpl(childExpr, relation.relatedModelClass, relations);
  });
}

function fetchColumnInfo(builder, models) {
  const knex = builder.knex();

  return Promise.all(models.map(ModelClass => {
    const table = ModelClass.tableName;

    if (columnInfo[table]) {
      return columnInfo[table];
    } else {
      columnInfo[table] = knex(table).columnInfo().then(info => {
        const result = {
          columns: Object.keys(info)
        };

        columnInfo[table] = result;
        return result;
      });

      return columnInfo[table];
    }
  }));
}

function forEachExpr(expr, modelClass, callback) {
  const relations = modelClass.getRelations();
  const relNames = Object.keys(relations);

  for (let i = 0, l = relNames.length; i < l; ++i) {
    const relName = relNames[i];
    const relation = relations[relName];
    const childExpr = expr.childExpression(relation.name);

    if (childExpr) {
      callback(childExpr, relation, relName);
    }
  }
}

function createSingleIdGetter(idCols) {
  const idCol = idCols[0];

  return (row) => {
    const val = row[idCol];

    if (!val) {
      return null;
    } else {
      return val;
    }
  };
}

function createTwoIdGetter(idCols) {
  const idCol1 = idCols[0];
  const idCol2 = idCols[1];

  return (row) => {
    const val1 = row[idCol1];
    const val2 = row[idCol2];

    if (!val1 || !val2) {
      return null;
    } else {
      return `${val1},${val2}`;
    }
  };
}

function createThreeIdGetter(idCols) {
  const idCol1 = idCols[0];
  const idCol2 = idCols[1];
  const idCol3 = idCols[2];

  return (row) => {
    const val1 = row[idCol1];
    const val2 = row[idCol2];
    const val3 = row[idCol3];

    if (!val1 || !val2 || !val3) {
      return null;
    } else {
      return `${val1},${val2},${val3}`;
    }
  };
}

function createNIdGetter(idCols) {
  return (row) => {
    let id = '';

    for (let i = 0, l = idCols.length; i < l; ++i) {
      const val = row[idCols[i]];

      if (!val) {
        return null;
      }

      id += (i > 0 ? ',' : '') + val;
    }

    return id;
  };
}

function createFilterQuery({builder, expr, relation}) {
  const filterQuery = relation.relatedModelClass
    .query()
    .childQueryOf(builder);

  for (let i = 0, l = expr.args.length; i < l; ++i) {
    const filterName = expr.args[i];
    const filter = expr.filters[filterName];

    if (typeof filter !== 'function') {
      throw new ValidationError({eager: `could not find filter "${filterName}" for relation "${relation.name}"`});
    }

    filter(filterQuery);
  }

  return filterQuery;
}

function createRelatedJoinFromQuery({filterQuery, relation, allRelations}) {
  const relatedJoinFromQuery = filterQuery.clone();

  const allForeignKeys = findAllForeignKeysForModel({
    modelClass: relation.relatedModelClass,
    allRelations
  });

  return relatedJoinFromQuery.select(allForeignKeys.filter(col => {
    return !relatedJoinFromQuery.hasSelection(col);
  }));
}

function findAllForeignKeysForModel({modelClass, allRelations}) {
  let foreignKeys = modelClass.getIdColumnArray().slice();

  allRelations.forEach(rel => {
    if (rel.relatedModelClass.tableName === modelClass.tableName) {
      rel.relatedCol.forEach(col => foreignKeys.push(col));
    }

    if (rel.ownerModelClass.tableName === modelClass.tableName) {
      rel.ownerCol.forEach(col => foreignKeys.push(col));
    }
  });

  return _.uniq(foreignKeys);
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
  }

  createBranch(parentModel) {
    const branch = Object.create(null);
    parentModel[this.relation.name] = branch;
    return branch;
  }

  getBranch(parentModel) {
    return parentModel[this.relation.name];
  }

  getModelFromBranch(branch, id) {
    return branch[id];
  }

  setModelToBranch(branch, id, model) {
    branch[id] = model;
  }

  finalizeBranch(branch, parentModel) {
    const relModels = _.values(branch);
    parentModel[this.relation.name] = relModels;
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
    return branch[this.relation.name];
  }

  setModelToBranch(branch, id, model) {
    branch[this.relation.name] = model;
  }

  finalizeBranch(branch, parentModel) {
    parentModel[this.relation.name] = branch || null;
    return branch || null;
  }
}
