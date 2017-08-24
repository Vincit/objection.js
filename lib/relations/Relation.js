'use strict';

const path = require('path');
const sortBy = require('lodash/sortBy');
const values = require('lodash/values');
const compact = require('lodash/compact');
const isEmpty = require('lodash/isEmpty');
const isSubclassOf = require('../utils/classUtils').isSubclassOf;
const resolveModel = require('../utils/resolveModel').resolveModel
const QueryBuilder = require('../queryBuilder/QueryBuilder');
const RelationProperty = require('./RelationProperty');
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

    this.ownerProp = null;
    this.relatedProp = null;

    this.joinTableOwnerProp = null;
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

    let joinFrom;
    let joinTo;

    const createRelationProperty = (refString, propName) => {
      try {
        return new RelationProperty(refString, (table) => {
          return [this.ownerModelClass, this.relatedModelClass].find(it => it.tableName === table);
        });
      } catch (err) {

        if (err instanceof RelationProperty.ModelNotFoundError) {
          throw this.createError('join: either `from` or `to` must point to the owner model table and the other one to the related table.');
        } else {
          throw this.createError(`${propName} must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].`);
        }
      }
    };

    joinFrom = createRelationProperty(mapping.join.from, 'join.from');
    joinTo = createRelationProperty(mapping.join.to, 'join.to');

    if (joinFrom.modelClass.tableName === this.ownerModelClass.tableName) {
      joinOwner = joinFrom;
      joinRelated = joinTo;
    } else if (joinTo.modelClass.tableName === this.ownerModelClass.tableName) {
      joinOwner = joinTo;
      joinRelated = joinFrom;
    } else {
      throw this.createError('join: either `from` or `to` must point to the owner model table.');
    }

    if (joinRelated.modelClass.tableName !== this.relatedModelClass.tableName) {
      throw this.createError('join: either `from` or `to` must point to the related model table.');
    }

    this.ownerProp = joinOwner;
    this.relatedProp = joinRelated;
    this.modify = this.parseModify(mapping);
  }

  get joinTable() {
    if (this._joinTableModelClass) {
      return this._joinTableModelClass.tableName;
    } else {
      return null;
    }
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
    relation.ownerProp = this.ownerProp;
    relation.relatedProp = this.relatedProp;
    relation.modify = this.modify;

    relation._joinTableModelClass = this._joinTableModelClass;
    relation.joinTableOwnerProp = this.joinTableOwnerProp;
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
    const relatedRefs = this.relatedProp.refs(builder);

    if (opt.isColumnRef) {
      for (let i = 0, l = relatedRefs.length; i < l; ++i) {
        builder.whereRef(relatedRefs[i], opt.ownerIds[i]);
      }
    } else if (containsNonNull(opt.ownerIds)) {
      builder.whereInComposite(relatedRefs, opt.ownerIds);
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
        for (let i = 0, l = this.relatedProp.size; i < l; ++i) {
          const relatedRef = this.relatedProp.ref(builder, i).table(opt.relatedTableAlias);
          const ownerRef = this.ownerProp.ref(builder, i).table(opt.ownerTable);

          join.on(relatedRef, ownerRef);
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