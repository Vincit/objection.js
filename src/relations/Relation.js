import _ from 'lodash';
import path from 'path';
import memoize from '../utils/decorators/memoize';
import {inherits, isSubclassOf} from '../utils/classUtils';
import {init, copyHiddenData} from '../utils/hiddenData';
import QueryBuilder from '../queryBuilder/QueryBuilder';

import RelationFindOperation from './RelationFindOperation';
import RelationUpdateOperation from './RelationUpdateOperation';
import RelationDeleteOperation from './RelationDeleteOperation';

/**
 * @typedef {Object} RelationJoin

 * @property {string|Array.<string>} from
 * @property {string|Array.<string>} to
 * @property {Object} through
 * @property {Constructor.<Model>} through.modelClass
 * @property {string|Array.<string>} through.from
 * @property {string|Array.<string>} through.to
 * @property {Array.<string>} through.extra
 */

/**
 * @typedef {Object} RelationMapping
 *
 * @property {Constructor.<Model>|string} modelClass
 * @property {Relation} relation
 * @property {Object|function(QueryBuilder)} modify
 * @property {Object|function(QueryBuilder)} filter
 * @property {RelationJoin} [join]
 */

/**
 * @abstract
 */
export default class Relation {

  constructor(relationName, OwnerClass) {
    /**
     * @type {string}
     */
    this.name = relationName;

    /**
     * @type {Constructor.<Model>}
     */
    this.ownerModelClass = OwnerClass;

    /**
     * @type {Constructor.<Model>}
     */
    this.relatedModelClass = null;

    /**
     * @type {Constructor.<Model>}
     */
    this._joinTableModelClass = null;

    /**
     * @type {Array.<string>}
     */
    this.ownerCol = null;

    /**
     * @type {Array.<string>}
     */
    this.ownerProp = null;

    /**
     * @type {Array.<string>}
     */
    this.relatedCol = null;

    /**
     * @type {Array.<string>}
     */
    this.relatedProp = null;

    /**
     * @type {string}
     */
    this.joinTable = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableOwnerCol = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableOwnerProp = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableRelatedCol = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableRelatedProp = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableExtraCols = null;

    /**
     * @type {Array.<string>}
     */
    this.joinTableExtraProps = null;

    /**
     * @type {function (QueryBuilder)}
     */
    this.modify = null;

    init(this);
  }

  /**
   * @param {function=} subclassConstructor
   * @return {Constructor.<Model>}
   */
  static extend(subclassConstructor) {
    inherits(subclassConstructor, this);
    return subclassConstructor;
  }

  /**
   * @param {RelationMapping} mapping
   */
  setMapping(mapping) {
    // Avoid require loop and import here.
    let Model = require(__dirname + '/../model/Model').default;

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

  /**
   * @return {boolean}
   */
  isOneToOne() {
    return false;
  }

  /**
   * @type {Constructor.<Model>}
   */
  joinTableModelClass(knex) {
    if (knex && knex !== this._joinTableModelClass.knex()) {
      return this._joinTableModelClass.bindKnex(knex);
    } else {
      return this._joinTableModelClass;
    }
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullOwnerCol() {
    return this.ownerCol.map(col => this.ownerModelClass.tableName + '.' + col);
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  fullRelatedCol() {
    return this.relatedCol.map(col => this.relatedModelClass.tableName + '.' + col);
  }

  /**
   * @returns {string}
   */
  @memoize
  relatedTableAlias() {
    return this.relatedModelClass.tableName + '_rel_' + this.name;
  }

  /**
   * @returns {Relation}
   */
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
    relation.joinTableExtraCols = this.joinTableExtraCols;
    relation.joinTableExtraProps = this.joinTableExtraProps;

    copyHiddenData(this, relation);

    return relation;
  }

  /**
   * @param {knex} knex
   * @returns {Relation}
   */
  bindKnex(knex) {
    const bound = this.clone();

    bound.relatedModelClass = this.relatedModelClass.bindKnex(knex);
    bound.ownerModelClass = this.ownerModelClass.bindKnex(knex);

    return bound;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {object} opt
   * @param {Array.<string>|Array.<Array.<(string|number)>>} opt.ownerIds
   * @param {boolean=} opt.isColumnRef
   * @returns {QueryBuilder}
   */
  findQuery(builder, opt) {
    const fullRelatedCol = this.fullRelatedCol();

    if (opt.isColumnRef) {
      for (let i = 0, l = fullRelatedCol.length; i < l; ++i) {
        builder.whereRef(fullRelatedCol[i], opt.ownerIds[i]);
      }
    } else {
      let hasIds = false;

      for (let i = 0, l = opt.ownerIds.length; i < l; ++i) {
        const id = opt.ownerIds[i];

        if (id) {
          hasIds = true;
          break;
        }
      }

      if (hasIds) {
        builder.whereInComposite(fullRelatedCol, opt.ownerIds);
      } else {
        builder.resolve([]);
      }
    }

    return builder.modify(this.modify);
  }

  /**
   * @param {QueryBuilder} builder
   * @param {object=} opt
   * @returns {QueryBuilder}
   */
  join(builder, opt) {
    opt = opt || {};

    opt.joinOperation = opt.joinOperation || 'join';
    opt.relatedTableAlias = opt.relatedTableAlias || this.relatedTableAlias();
    opt.relatedJoinSelectQuery = opt.relatedJoinSelectQuery || this.relatedModelClass.query().childQueryOf(builder);
    opt.relatedTable = opt.relatedTable || this.relatedModelClass.tableName;
    opt.ownerTable = opt.ownerTable || this.ownerModelClass.tableName;

    const relatedCol = this.relatedCol.map(col => `${opt.relatedTableAlias}.${col}`);
    const ownerCol = this.ownerCol.map(col => `${opt.ownerTable}.${col}`);

    const relatedJoinSelectQuery = opt.relatedJoinSelectQuery
      .modify(this.modify)
      .as(opt.relatedTableAlias);

    return builder
      [opt.joinOperation](relatedJoinSelectQuery, join => {
        for (let i = 0, l = relatedCol.length; i < l; ++i) {
          join.on(relatedCol[i], '=', ownerCol[i]);
        }
      });
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model} owner
   * @returns {QueryBuilderOperation}
   */
  insert(builder, owner) {
    this.throwError('not implemented');
  }

  /**
   * @param {QueryBuilder} builder
   * @param {Model} owner
   * @returns {QueryBuilderOperation}
   */
  update(builder, owner) {
    return new RelationUpdateOperation('update', {
      relation: this,
      owner: owner
    });
  }

  /**
   * @param {QueryBuilder} builder
   * @param {Model} owner
   * @returns {QueryBuilderOperation}
   */
  patch(builder, owner) {
    return new RelationUpdateOperation('patch', {
      relation: this,
      owner: owner,
      modelOptions: {patch: true}
    });
  }

  /**
   * @param {QueryBuilder} builder
   * @param {Array.<Model>} owners
   * @returns {QueryBuilderOperation}
   */
  find(builder, owners) {
    return new RelationFindOperation('find', {
      relation: this,
      owners: owners
    });
  }

  /**
   * @param {QueryBuilder} builder
   * @param {Model} owner
   * @returns {QueryBuilderOperation}
   */
  delete(builder, owner) {
    return new RelationDeleteOperation('delete', {
      relation: this,
      owner: owner
    });
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model} owner
   * @returns {QueryBuilderOperation}
   */
  relate(builder, owner) {
    this.throwError('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @param {QueryBuilder} builder
   * @param {Model} owner
   * @returns {QueryBuilderOperation}
   */
  unrelate(builder, owner) {
    this.throwError('not implemented');
  }

  /* istanbul ignore next */
  /**
   * @abstract
   * @protected
   */
  createRelationProp(owners, related) {
    this.throwError('not implemented');
  }

  /**
   * @protected
   */
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

  /**
   * @protected
   */
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

  /**
   * @protected
   */
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

  /**
   * @protected
   */
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

  /**
   * @protected
   */
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

  /**
   * @protected
   */
  throwError(message) {
    if (this.ownerModelClass && this.ownerModelClass.name && this.name) {
      throw new Error(`${this.ownerModelClass.name}.relationMappings.${this.name}: ${message}`);
    } else {
      throw new Error(`${this.constructor.name}: ${message}`);
    }
  }
}

function isAbsolutePath(pth) {
  return path.normalize(pth + '/') === path.normalize(path.resolve(pth) + '/');
}