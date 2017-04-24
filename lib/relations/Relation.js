'use strict';

const _ = require('lodash');
const path = require('path');
const memoize = require('../utils/decorators/memoize');
const decorate = require('../utils/decorators/decorate');
const inherits = require('../utils/classUtils').inherits;
const isSubclassOf = require('../utils/classUtils').isSubclassOf;
const init = require('../utils/hiddenData').init;
const copyHiddenData = require('../utils/hiddenData').copyHiddenData;
const QueryBuilder = require('../queryBuilder/QueryBuilder');

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
    init(this);
  }

  static extend(subclassConstructor) {
    inherits(subclassConstructor, this);
    return subclassConstructor;
  }

  setMapping(mapping) {
    // Avoid require loop and import here.
    let Model = require(__dirname + '/../model/Model');

    if (!isSubclassOf(this.ownerModelClass, Model)) {
      this.throwError('Relation\'s owner is not a subclass of Model');
    }

    if (!mapping.modelClass) {
      this.throwError('modelClass is not defined');
    }

    this.relatedModelClass = this.resolveModel(Model, mapping.modelClass, 'modelClass');

    if (!mapping.relation) {
      this.throwError('relation is not defined');
    }

    if (!isSubclassOf(mapping.relation, Relation)) {
      this.throwError('relation is not a subclass of Relation');
    }

    if (!mapping.join || !mapping.join.from || !mapping.join.to) {
      this.throwError('join must be an object that maps the columns of the related models together. For example: {from: "SomeTable.id", to: "SomeOtherTable.someModelId"}');
    }

    let joinOwner = null;
    let joinRelated = null;

    let joinFrom = this.parseReference(mapping.join.from);
    let joinTo = this.parseReference(mapping.join.to);

    if (!joinFrom.table || _.isEmpty(joinFrom.columns)) {
      this.throwError('join.from must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].');
    }

    if (!joinTo.table || _.isEmpty(joinTo.columns)) {
      this.throwError('join.to must have format TableName.columnName. For example "SomeTable.id" or in case of composite key ["SomeTable.a", "SomeTable.b"].');
    }

    if (joinFrom.table === this.ownerModelClass.tableName) {
      joinOwner = joinFrom;
      joinRelated = joinTo;
    } else if (joinTo.table === this.ownerModelClass.tableName) {
      joinOwner = joinTo;
      joinRelated = joinFrom;
    } else {
      this.throwError('join: either `from` or `to` must point to the owner model table.');
    }

    if (joinRelated.table !== this.relatedModelClass.tableName) {
      this.throwError('join: either `from` or `to` must point to the related model table.');
    }

    this.ownerCol = joinOwner.columns;
    this.ownerProp = this.propertyName(this.ownerCol, this.ownerModelClass);
    this.relatedCol = joinRelated.columns;
    this.relatedProp = this.propertyName(this.relatedCol, this.relatedModelClass);
    this.modify = this.parseModify(mapping);
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

  fullRelatedCol() {
    return this.relatedCol.map(col => this.relatedModelClass.tableName + '.' + col);
  }

  fullOwnerCol() {
    return this.ownerCol.map(col => this.ownerModelClass.tableName + '.' + col);
  }

  relatedTableAlias() {
    return this.relatedModelClass.tableName + '_rel_' + this.name;
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

    copyHiddenData(this, relation);

    return relation;
  }

  bindKnex(knex) {
    const bound = this.clone();

    bound.relatedModelClass = this.relatedModelClass.bindKnex(knex);
    bound.ownerModelClass = this.ownerModelClass.bindKnex(knex);

    return bound;
  }

  findQuery(builder, opt) {
    const fullRelatedCol = this.fullRelatedCol();

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
    opt.relatedTableAlias = opt.relatedTableAlias || this.relatedTableAlias();
    opt.relatedJoinSelectQuery = opt.relatedJoinSelectQuery || this.relatedModelClass.query().childQueryOf(builder);
    opt.relatedTable = opt.relatedTable || this.relatedModelClass.tableName;
    opt.ownerTable = opt.ownerTable || this.ownerModelClass.tableName;

    const relatedCol = this.relatedCol.map(col => `${opt.relatedTableAlias}.${col}`);
    const ownerCol = this.ownerCol.map(col => `${opt.ownerTable}.${col}`);

    let relatedSelect = opt.relatedJoinSelectQuery
      .modify(this.modify)
      .as(opt.relatedTableAlias);

    if (relatedSelect.isSelectAll()) {
      // No need to join a subquery if the query is `select * from "RelatedTable"`.
      relatedSelect = `${this.relatedModelClass.tableName} as ${opt.relatedTableAlias}`
    }

    return builder
      [opt.joinOperation](relatedSelect, join => {
        for (let i = 0, l = relatedCol.length; i < l; ++i) {
          join.on(relatedCol[i], '=', ownerCol[i]);
        }
      });
  }

  /* istanbul ignore next */
  insert(builder, owner) {
    this.throwError('not implemented');
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
    this.throwError('not implemented');
  }

  /* istanbul ignore next */
  unrelate(builder, owner) {
    this.throwError('not implemented');
  }

  propertyName(columns, modelClass) {
    return columns.map(column => {
      let propertyName = modelClass.columnNameToPropertyName(column);

      if (!propertyName) {
        throw new Error(modelClass.name +
          '.$parseDatabaseJson probably transforms the value of the column ' + column + '.' +
          ' This is a no-no because ' + column +
          ' is needed in the relation ' + this.ownerModelClass.tableName + '.' + this.name);
      }

      return propertyName;
    });
  }

  parseModify(mapping) {
    let modify = mapping.modify || mapping.filter;

    if (_.isFunction(modify)) {
      return modify;
    } else if (_.isObject(modify)) {
      return function (queryBuilder) {
        queryBuilder.where(modify);
      };
    } else {
      return _.noop;
    }
  }

  parseReference(ref) {
    if (!_.isArray(ref)) {
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

    models1 = _.compact(models1);
    models2 = _.compact(models2);

    if (_.isEmpty(models1) && _.isEmpty(models2)) {
      return [];
    }

    if (!_.isEmpty(models1)) {
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

    return _.sortBy(_.values(modelsById), idProperty);
  }

  resolveModel(Model, modelClass, logPrefix) {
    const requireModel = (path) => {
      let ModelClass;

      try {
        // babel 6 style of exposing es6 exports to commonjs https://github.com/babel/babel/issues/2683
        let module = require(path);

        ModelClass = isSubclassOf(module.default, Model)
          ? module.default
          : module;
      } catch (err) {
        return null;
      }

      if (!isSubclassOf(ModelClass, Model)) {
        return null;
      }

      return ModelClass;
    };

    if (_.isString(modelClass)) {
      let ModelClass = null;

      if (isAbsolutePath(modelClass)) {
        ModelClass = requireModel(modelClass);
      } else {
        // If the path is not a absolute, try the modelPaths of the owner model class.
        _.each(this.ownerModelClass.modelPaths, modelPath => {
          ModelClass = requireModel(path.join(modelPath, modelClass));

          if (isSubclassOf(ModelClass, Model)) {
            // Break the loop.
            return false;
          }
        });
      }

      if (!isSubclassOf(ModelClass, Model)) {
        this.throwError(`${logPrefix}: ${modelClass} is an invalid file path to a model class`);
      }

      return ModelClass;
    } else {
      if (!isSubclassOf(modelClass, Model)) {
        this.throwError(`${logPrefix} is not a subclass of Model or a file path to a module that exports one.`);
      }

      return modelClass;
    }
  }

  throwError(message) {
    if (this.ownerModelClass && this.ownerModelClass.name && this.name) {
      throw new Error(`${this.ownerModelClass.name}.relationMappings.${this.name}: ${message}`);
    } else {
      throw new Error(`${this.constructor.name}: ${message}`);
    }
  }
}

/**
 * Until node gets decorators, we need to apply them like this.
 */
decorate(Relation.prototype, [{
  decorator: memoize,
  properties: [
    'fullRelatedCol',
    'fullOwnerCol',
    'relatedTableAlias'
  ]
}]);

function isAbsolutePath(pth) {
  return path.normalize(pth + '/') === path.normalize(path.resolve(pth) + '/');
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