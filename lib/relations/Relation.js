'use strict';

const path = require('path');
const sortBy = require('lodash/sortBy');
const values = require('lodash/values');
const compact = require('lodash/compact');
const isEmpty = require('lodash/isEmpty');
const isSubclassOf = require('../utils/classUtils').isSubclassOf;
const resolveModel = require('../utils/resolveModel').resolveModel
const QueryBuilder = require('../queryBuilder/QueryBuilder');
const getModel = () => require('../model/Model');

const RelationFindOperation = require('./RelationFindOperation');
const RelationUpdateOperation = require('./RelationUpdateOperation');
const RelationDeleteOperation = require('./RelationDeleteOperation');

class Relation {

  constructor(relationName, OwnerClass) {
    this.name = relationName;
    this.ownerModelClass = OwnerClass;
    this.relatedModelClass = null;
    this._joinTableModelClass = null;

    this.ownerCol = null;
    this.ownerProp = null;
    this.relatedCol = null;
    this.relatedProp = null;

    this.joinTable = null;
    this.joinTableOwnerCol = null;
    this.joinTableOwnerProp = null;
    this.joinTableRelatedCol = null;
    this.joinTableRelatedProp = null;
    this.joinTableExtras = [];
    
    this.modify = null;
  }

  setMapping(mapping) {
    const Model = getModel();

    if (!isSubclassOf(this.ownerModelClass, Model)) {
      throw this.createError('Relation\'s owner is not a subclass of Model');
    }

    if (!mapping.modelClass) {
      throw this.createError('modelClass is not defined');
    }

    try {
      this.relatedModelClass = resolveModel(mapping.modelClass, this.ownerModelClass.modelPaths, 'modelClass');
    } catch (err) {
      throw this.createError(err.message);
    }

    if (!mapping.relation) {
      throw this.createError('relation is not defined');
    }

    if (!isSubclassOf(mapping.relation, Relation)) {
      throw this.createError('relation is not a subclass of Relation');
    }

    if (!mapping.join || !mapping.join.from || !mapping.join.to) {
      throw this.createError('join must be an object that maps the columns of the related models together. For example: {from: "SomeTable.id", to: "SomeOtherTable.someModelId"}');
    }

    let joinOwner = null;
    let joinRelated = null;

    let joinFrom = this.parseReference(mapping.join.from);
    let joinTo = this.parseReference(mapping.join.to);

    if (!joinFrom.table || isEmpty(joinFrom.columns)) {
      throw this.createError('join.from must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].');
    }

    if (!joinTo.table || isEmpty(joinTo.columns)) {
      throw this.createError('join.to must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].');
    }

    if (joinFrom.table === this.ownerModelClass.tableName) {
      joinOwner = joinFrom;
      joinRelated = joinTo;
    } else if (joinTo.table === this.ownerModelClass.tableName) {
      joinOwner = joinTo;
      joinRelated = joinFrom;
    } else {
      throw this.createError('join: either `from` or `to` must point to the owner model table.');
    }

    if (joinRelated.table !== this.relatedModelClass.tableName) {
      throw this.createError('join: either `from` or `to` must point to the related model table.');
    }

    this.ownerCol = joinOwner.columns;
    this.ownerProp = this.propertyName(this.ownerCol, this.ownerModelClass);
    this.relatedCol = joinRelated.columns;
    this.relatedProp = this.propertyName(this.relatedCol, this.relatedModelClass);
    this.modify = this.parseModify(mapping);
  }

  fullRelatedCol(builder) {
    const table = builder.tableRefFor(this.relatedModelClass);
    const col = new Array(this.relatedCol.length);

    for (let i = 0, l = col.length; i < l; ++i) {
      col[i] = `${table}.${this.relatedCol[i]}`;
    }

    return col;
  }

  fullOwnerCol(builder) {
    const table = builder.tableRefFor(this.ownerModelClass);
    const col = new Array(this.ownerCol.length);

    for (let i = 0, l = col.length; i < l; ++i) {
      col[i] = `${table}.${this.ownerCol[i]}`;
    }

    return col;
  }

  relatedTableAlias(builder) {
    const tableRef = builder.tableRefFor(this.relatedModelClass);
    return `${tableRef}_rel_${this.name}`;
  }

  isOneToOne() {
    return false;
  }

  joinTableModelClass(knex) {
    if (knex && knex !== this._joinTableModelClass.knex()) {
      return this._joinTableModelClass.bindKnex(knex);
    } else {
      return this._joinTableModelClass;
    }
  }

  clone() {
    const relation = new this.constructor(this.name, this.ownerModelClass);

    relation.relatedModelClass = this.relatedModelClass;
    relation.ownerCol = this.ownerCol;
    relation.ownerProp = this.ownerProp;
    relation.relatedCol = this.relatedCol;
    relation.relatedProp = this.relatedProp;
    relation.modify = this.modify;

    relation._joinTableModelClass = this._joinTableModelClass;
    relation.joinTable = this.joinTable;
    relation.joinTableOwnerCol = this.joinTableOwnerCol;
    relation.joinTableOwnerProp = this.joinTableOwnerProp;
    relation.joinTableRelatedCol = this.joinTableRelatedCol;
    relation.joinTableRelatedProp = this.joinTableRelatedProp;
    relation.joinTableExtras = this.joinTableExtras;

    return relation;
  }

  bindKnex(knex) {
    const bound = this.clone();

    bound.relatedModelClass = this.relatedModelClass.bindKnex(knex);
    bound.ownerModelClass = this.ownerModelClass.bindKnex(knex);

    return bound;
  }

  findQuery(builder, opt) {
    const fullRelatedCol = this.fullRelatedCol(builder);

    if (opt.isColumnRef) {
      for (let i = 0, l = fullRelatedCol.length; i < l; ++i) {
        builder.whereRef(fullRelatedCol[i], opt.ownerIds[i]);
      }
    } else if (containsNonNull(opt.ownerIds)) {
      builder.whereInComposite(fullRelatedCol, opt.ownerIds);
    } else {
      builder.resolve([]);
    }

    return builder.modify(this.modify);
  }

  join(builder, opt) {
    opt = opt || {};

    opt.joinOperation = opt.joinOperation || 'join';
    opt.relatedTableAlias = opt.relatedTableAlias || this.relatedTableAlias(builder);
    opt.relatedJoinSelectQuery = opt.relatedJoinSelectQuery || this.relatedModelClass.query().childQueryOf(builder);
    opt.relatedTable = opt.relatedTable || builder.tableNameFor(this.relatedModelClass);
    opt.ownerTable = opt.ownerTable || builder.tableRefFor(this.ownerModelClass);

    let relatedSelect = opt.relatedJoinSelectQuery
      .modify(this.modify)
      .as(opt.relatedTableAlias);

    if (relatedSelect.isSelectAll()) {
      // No need to join a subquery if the query is `select * from "RelatedTable"`.
      relatedSelect = `${opt.relatedTable} as ${opt.relatedTableAlias}`;
    }

    return builder
      [opt.joinOperation](relatedSelect, join => {
        for (let i = 0, l = this.relatedCol.length; i < l; ++i) {
          const relatedCol = `${opt.relatedTableAlias}.${this.relatedCol[i]}`;
          const ownerCol = `${opt.ownerTable}.${this.ownerCol[i]}`;

          join.on(relatedCol, '=', ownerCol);
        }
      });
  }

  /* istanbul ignore next */
  insert(builder, owner) {
    throw this.createError('not implemented');
  }

  update(builder, owner) {
    return new RelationUpdateOperation('update', {
      relation: this,
      owner: owner
    });
  }

  patch(builder, owner) {
    return new RelationUpdateOperation('patch', {
      relation: this,
      owner: owner,
      modelOptions: {patch: true}
    });
  }

  find(builder, owners) {
    return new RelationFindOperation('find', {
      relation: this,
      owners: owners
    });
  }

  delete(builder, owner) {
    return new RelationDeleteOperation('delete', {
      relation: this,
      owner: owner
    });
  }

  /* istanbul ignore next */
  relate(builder, owner) {
    throw this.createError('not implemented');
  }

  /* istanbul ignore next */
  unrelate(builder, owner) {
    throw this.createError('not implemented');
  }

  propertyName(columns, modelClass) {
    return columns.map(column => {
      let propertyName = modelClass.columnNameToPropertyName(column);

      if (!propertyName) {
        throw new Error(modelClass.name +
          '.$parseDatabaseJson probably transforms the value of the column ' + column + '.' +
          ' This is a no-no because ' + column +
          ' is needed in the relation ' + this.ownerModelClass.name + '.' + this.name);
      }

      return propertyName;
    });
  }

  parseModify(mapping) {
    let modify = mapping.modify || mapping.filter;
    let type = typeof modify;

    if (type === 'function') {
      return modify;
    } else if (modify && type === 'object') {
      return (queryBuilder) => {
        queryBuilder.where(modify);
      };
    } else {
      return () => {};
    }
  }

  parseReference(ref) {
    if (!Array.isArray(ref)) {
      ref = [ref];
    }

    let table = null;
    let columns = [];

    for (let i = 0; i < ref.length; ++i) {
      const refItem = ref[i];
      const ndx = refItem.lastIndexOf('.');

      let tableName = refItem.substr(0, ndx).trim();
      let columnName = refItem.substr(ndx + 1, refItem.length).trim();

      if (!tableName || (table && table !== tableName) || !columnName) {
        return {
          table: null,
          columns: []
        };
      } else {
        table = tableName;
      }

      columns.push(columnName);
    }

    return {
      table: table,
      columns: columns
    };
  }

  mergeModels(models1, models2) {
    let modelClass;

    models1 = compact(models1);
    models2 = compact(models2);

    if (isEmpty(models1) && isEmpty(models2)) {
      return [];
    }

    if (!isEmpty(models1)) {
      modelClass = models1[0].constructor;
    } else {
      modelClass = models2[0].constructor;
    }

    let idProperty = modelClass.getIdPropertyArray();
    let modelsById = Object.create(null);

    for (let i = 0, l = models1.length; i < l; ++i) {
      const model = models1[i];
      const key = model.$propKey(idProperty);

      modelsById[key] = model;
    }

    for (let i = 0, l = models2.length; i < l; ++i) {
      const model = models2[i];
      const key = model.$propKey(idProperty);

      modelsById[key] = model;
    }

    return sortBy(values(modelsById), idProperty);
  }

  createError(message) {
    if (this.ownerModelClass && this.ownerModelClass.name && this.name) {
      return new Error(`${this.ownerModelClass.name}.relationMappings.${this.name}: ${message}`);
    } else {
      return new Error(`${this.constructor.name}: ${message}`);
    }
  }
}

function containsNonNull(arr) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    const val = arr[i];

    if (Array.isArray(val) && containsNonNull(val)) {
      return true;
    } else if (val !== null && val !== undefined) {
      return true;
    }
  }

  return false;
}

module.exports = Relation;