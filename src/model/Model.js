import _ from 'lodash';
import AjvValidator from './AjvValidator';
import QueryBuilder from '../queryBuilder/QueryBuilder';
import ReferenceBuilder from '../queryBuilder/ReferenceBuilder';
import inheritModel from './inheritModel';
import RelationExpression from '../queryBuilder/RelationExpression';
import {visitModels} from './modelVisitor';

import {inherits} from '../utils/classUtils';
import {inheritHiddenData} from '../utils/hiddenData';
import splitQueryProps from '../utils/splitQueryProps';
import hiddenData from '../utils/decorators/hiddenData';
import memoize from '../utils/decorators/memoize';

import Relation from '../relations/Relation';
import HasOneRelation from '../relations/hasOne/HasOneRelation';
import HasManyRelation from '../relations/hasMany/HasManyRelation';
import ManyToManyRelation from '../relations/manyToMany/ManyToManyRelation';
import BelongsToOneRelation from '../relations/belongsToOne/BelongsToOneRelation';
import HasOneThroughRelation from '../relations/hasOneThrough/HasOneThroughRelation';

import InstanceFindOperation from '../queryBuilder/operations/InstanceFindOperation';
import InstanceInsertOperation from '../queryBuilder/operations/InstanceInsertOperation';
import InstanceUpdateOperation from '../queryBuilder/operations/InstanceUpdateOperation';
import InstanceDeleteOperation from '../queryBuilder/operations/InstanceDeleteOperation';

import JoinEagerOperation from '../queryBuilder/operations/JoinEagerOperation';
import WhereInEagerOperation from '../queryBuilder/operations/WhereInEagerOperation';

const KnexRaw = require('knex/lib/raw');
const KnexQueryBuilder = require('knex/lib/query/builder');

const JoinEagerAlgorithm = () => {
  return new JoinEagerOperation('eager');
};

const WhereInEagerAlgorithm = () => {
  return new WhereInEagerOperation('eager');
};

/**
 * @typedef {Object} ModelOptions
 *
 * @property {boolean} [patch]
 * @property {boolean} [skipValidation]
 * @property {Model} [old]
 */

export default class Model {

  static QueryBuilder = QueryBuilder;
  static RelatedQueryBuilder = QueryBuilder;

  static HasOneRelation = HasOneRelation;
  static HasManyRelation = HasManyRelation;
  static ManyToManyRelation = ManyToManyRelation;
  static BelongsToOneRelation = BelongsToOneRelation;
  static HasOneThroughRelation = HasOneThroughRelation;

  static JoinEagerAlgorithm = JoinEagerAlgorithm;
  static WhereInEagerAlgorithm = WhereInEagerAlgorithm;

  /**
   * @type {string}
   */
  static tableName = null;

  /**
   * @type {Object}
   */
  static jsonSchema = null;

  /**
   * @type {string|Array.<string>}
   */
  static idColumn = 'id';

  /**
   * @type {string}
   */
  static uidProp = '#id';

  /**
   * @type {string}
   */
  static uidRefProp = '#ref';

  /**
   * @type {string}
   */
  static dbRefProp = '#dbRef';

  /**
   * @type {RegExp}
   */
  static propRefRegex = /#ref{([^\.]+)\.([^}]+)}/g;

  /**
   * @type {Array.<string>}
   */
  static jsonAttributes = null;

  /**
   * @type {Array.<string>}
   */
  static virtualAttributes = null;

  /**
   * @type {Object.<string, RelationMapping>}
   */
  static relationMappings = null;

  /**
   * @type {Array.<string>}
   */
  static modelPaths = [];

  /**
   * @type {boolean}
   */
  static pickJsonSchemaProperties = true;

  /**
   * @type {Constructor.<? extends EagerOperation>}
   */
  static defaultEagerAlgorithm = WhereInEagerAlgorithm;

  /**
   * @type {object}
   */
  static defaultEagerOptions = null;

  /**
   * @private
   */
  static $$knex = null;

  /**
   * @param {*=} id
   * @returns {*}
   */
  $id(id) {
    if (arguments.length > 0) {
      return setId(this, arguments[0]);
    } else {
      return getId(this);
    }
  }

  /**
   * @returns {knex}
   */
  $knex() {
    return this.constructor.knex();
  }

  /**
   * @returns {knex}
   */
  $transaction() {
    return this.constructor.transaction();
  }

  /**
   * @param {Transaction=} trx
   * @returns {QueryBuilder}
   */
  $query(trx) {
    const ModelClass = this.constructor;

    return ModelClass.QueryBuilder
      .forClass(ModelClass)
      .transacting(trx)
      .findOperationFactory(() => {
        return new InstanceFindOperation('find', {instance: this});
      })
      .insertOperationFactory(() => {
        return new InstanceInsertOperation('insert', {instance: this});
      })
      .updateOperationFactory(() => {
        return new InstanceUpdateOperation('update', {instance: this});
      })
      .patchOperationFactory(() => {
        return new InstanceUpdateOperation('patch', {instance: this, modelOptions: {patch: true}});
      })
      .deleteOperationFactory(() => {
        return new InstanceDeleteOperation('delete', {instance: this});
      })
      .relateOperationFactory(() => {
        throw new Error('`relate` makes no sense in this context');
      })
      .unrelateOperationFactory(() => {
        throw new Error('`unrelate` makes no sense in this context');
      });
  }

  /**
   * @param {string} relationName
   * @param {Transaction=} trx
   * @returns {QueryBuilder}
   */
  $relatedQuery(relationName, trx) {
    const ModelClass = this.constructor;
    const relation = ModelClass.getRelation(relationName);
    const RelatedModelClass = relation.relatedModelClass;

    return ModelClass.RelatedQueryBuilder
      .forClass(RelatedModelClass)
      .transacting(trx)
      .findOperationFactory(builder => {
        return relation.find(builder, [this]);
      })
      .insertOperationFactory(builder => {
        return relation.insert(builder, this);
      })
      .updateOperationFactory(builder => {
        return relation.update(builder, this);
      })
      .patchOperationFactory(builder => {
        return relation.patch(builder, this);
      })
      .deleteOperationFactory(builder => {
        return relation.delete(builder, this);
      })
      .relateOperationFactory(builder => {
        return relation.relate(builder, this);
      })
      .unrelateOperationFactory(builder => {
        return relation.unrelate(builder, this);
      });
  }

  /**
   * @param {string|RelationExpression} relationExpression
   * @param {Object.<string, function(QueryBuilder)>=} filters
   * @returns {QueryBuilder}
   */
  $loadRelated(relationExpression, filters) {
    return this.constructor.loadRelated(this, relationExpression, filters);
  }

  /**
   * @param {Constructor.<Model>=} filterConstructor
   * @param {function(Model)} callback
   * @return {Model}
   */
  $traverse(filterConstructor, callback) {
    if (_.isUndefined(callback)) {
      callback = filterConstructor;
      filterConstructor = null;
    }

    this.constructor.traverse(filterConstructor, this, callback);
    return this;
  }

  /**
   * @param {Object} jsonSchema
   * @param {Object} json
   * @param {ModelOptions=} options
   * @return {Object}
   */
  $beforeValidate(jsonSchema, json, options) {
    /* istanbul ignore next */
    return jsonSchema;
  }

  /**
   * @param {Object=} json
   * @param {ModelOptions=} options
   * @throws {ValidationError}
   * @return {Object}
   */
  $validate(json = this, options = {}) {
    if (json instanceof Model) {
      // Strip away relations and other internal stuff.
      json = json.$parseJson(json.$toJson(true));
    }

    if (options.skipValidation) {
      return json;
    }

    const validator = this.constructor.getValidator();
    const args = {
      options: options,
      model: this,
      json: json,
      ctx: Object.create(null)
    };

    validator.beforeValidate(args);
    json = validator.validate(args);
    validator.afterValidate(args);

    return json;
  }

  /**
   * @param {Object=} json
   * @param {ModelOptions=} options
   */
  $afterValidate(json, options) {
    // Do nothing by default.
  }

  /**
   * @param {Object} json
   * @return {Object}
   */
  $parseDatabaseJson(json) {
    const jsonAttr = this.constructor.getJsonAttributes();

    if (jsonAttr.length) {
      for (let i = 0, l = jsonAttr.length; i < l; ++i) {
        const attr = jsonAttr[i];
        const value = json[attr];

        if (_.isString(value)) {
          const parsed = tryParseJson(value);

          // tryParseJson returns undefined if parsing failed.
          if (parsed !== undefined) {
            json[attr] = parsed;
          }
        }
      }
    }

    return json;
  }

  /**
   * @param {Object} json
   * @return {Object}
   */
  $formatDatabaseJson(json) {
    const jsonAttr = this.constructor.getJsonAttributes();

    if (jsonAttr.length) {
      for (let i = 0, l = jsonAttr.length; i < l; ++i) {
        const attr = jsonAttr[i];
        const value = json[attr];

        // list of omitted objects is copy pasted from splitQueryProps
        // TODO
        if (_.isObject(value) && !(value instanceof KnexQueryBuilder || value instanceof KnexRaw || value instanceof ReferenceBuilder)) {
          json[attr] = JSON.stringify(value);
        }
      }
    }

    return json;
  }

  /**
   * @param {Object} json
   * @param {ModelOptions=} options
   * @return {Object}
   */
  $parseJson(json, options) {
    return json;
  }

  /**
   * @param {Object} json
   * @return {Object}
   */
  $formatJson(json) {
    return json;
  }

  /**
   * @param {Object} json
   * @param {ModelOptions=} options
   * @returns {Model}
   * @throws ValidationError
   */
  $setJson(json, options = {}) {
    json = json || {};

    if (!_.isObject(json)
      || _.isString(json)
      || _.isNumber(json)
      || _.isDate(json)
      || _.isArray(json)
      || _.isFunction(json)
      || _.isTypedArray(json)
      || _.isRegExp(json)) {

      throw new Error('You should only pass objects to $setJson method. '
        + '$setJson method was given an invalid value '
        + json);
    }

    // If the json contains query properties like, knex Raw queries or knex/objection query
    // builders, we need to split those off into a separate object. This object will be
    // joined back in the $toDatabaseJson method.
    const split = splitQueryProps(this.constructor, json);

    if (split.query) {
      // Stash the query properties for later use in $toDatabaseJson method.
      this.$stashedQueryProps(split.query);
    }

    split.json = this.$parseJson(split.json, options);
    split.json = this.$validate(split.json, options);

    this.$set(split.json);

    const relations = this.constructor.getRelationArray();
    // Parse relations into Model instances.
    for (let i = 0, l = relations.length; i < l; ++i) {
      const relation = relations[i];
      const relationName = relation.name;

      if (_.has(json, relationName)) {
        const relationJson = json[relationName];

        if (Array.isArray(relationJson)) {
          this[relationName] = relation.relatedModelClass.ensureModelArray(relationJson, options);
        } else if (relationJson) {
          this[relationName] = relation.relatedModelClass.ensureModel(relationJson, options);
        } else {
          this[relationName] = null;
        }
      }
    }
  }

  /**
   * @param {Object} json
   * @returns {Model}
   */
  $setDatabaseJson(json) {
    json = this.$parseDatabaseJson(json);

    if (json) {
      const keys = Object.keys(json);

      for (let i = 0, l = keys.length; i < l; ++i) {
        const key = keys[i];
        this[key] = json[key];
      }
    }

    return this;
  }

  /**
   * @param {Object} obj
   * @returns {Model}
   */
  $set(obj) {
    if (obj) {
      const keys = Object.keys(obj);

      for (let i = 0, l = keys.length; i < l; ++i) {
        const key = keys[i];
        const value = obj[key];

        if (key.charAt(0) !== '$' && typeof value !== 'function') {
          this[key] = value;
        }
      }
    }

    return this;
  }

  /**
   * @param {boolean=} shallow
   */
  $toJson(shallow) {
    if (shallow) {
      return this.$$toJson(false, this.constructor.getRelations(), null);
    } else {
      return this.$$toJson(false, null, null);
    }
  }

  toJSON() {
    return this.$toJson();
  }

  /**
   * @override
   */
  $toDatabaseJson() {
    const jsonSchema = this.constructor.getJsonSchema();

    if (jsonSchema && this.constructor.pickJsonSchemaProperties) {
      return this.$$toJson(true, null, jsonSchema.properties);
    } else {
      return this.$$toJson(true, this.constructor.getRelations(), null);
    }
  }

  /**
   * @param {Object} queryContext
   * @returns {Promise|*}
   */
  $beforeInsert(queryContext) {}

  /**
   * @param {Object} queryContext
   * @returns {Promise|*}
   */
  $afterInsert(queryContext) {}

  /**
   * @param {ModelOptions} opt
   * @param {QueryBuilderContext} queryContext
   * @returns {Promise|*}
   */
  $beforeUpdate(opt, queryContext) {}

  /**
   * @param {ModelOptions} opt
   * @param {QueryBuilderContext} queryContext
   * @returns {Promise|*}
   */
  $afterUpdate(opt, queryContext) {}

  /**
   * @param {QueryBuilderContext} queryContext
   * @returns {Promise|*}
   */
  $afterGet(queryContext) {}

  /**
   * @param {QueryBuilderContext} queryContext
   * @returns {Promise|*}
   */
  $beforeDelete(queryContext) {}

  /**
   * @param {QueryBuilderContext} queryContext
   * @returns {Promise|*}
   */
  $afterDelete(queryContext) {}

  /**
   * @param {string|Array.<string>|Object.<string, boolean>} keys
   * @returns {Model}
   */
  $omit() {
    if (arguments.length === 1 && _.isObject(arguments[0])) {
      const keys = arguments[0];

      if (Array.isArray(keys)) {
        omitArray(this, keys);
      } else {
        omitObject(this, keys);
      }
    } else {
      omitArray(this, _.toArray(arguments));
    }

    return this;
  }

  /**
   * @param {string|Array.<string>|Object.<string, boolean>} keys
   * @returns {Model} `this` for chaining.
   */
  $pick() {
    if (arguments.length === 1 && _.isObject(arguments[0])) {
      const keys = arguments[0];

      if (Array.isArray(keys)) {
        pickArray(this, keys);
      } else {
        pickObject(this, keys);
      }
    } else {
      pickArray(this, _.toArray(arguments));
    }

    return this;
  }

  /**
   * @param {Array.<string>} props
   * @return {Array.<*>}
   */
  $values() {
    if (arguments.length === 0) {
      return _.values(this);
    } else {
      const args = (arguments.length === 1 && Array.isArray(arguments[0]))
        ? arguments[0]
        : arguments;

      switch (args.length) {
        case 1: return [this[args[0]]];
        case 2: return [this[args[0]], this[args[1]]];
        case 3: return [this[args[0]], this[args[1]], this[args[2]]];
        default: {
          const ret = new Array(args.length);

          for (let i = 0, l = args.length; i < l; ++i) {
            ret[i] = this[args[i]];
          }

          return ret;
        }
      }
    }
  }

  /**
   * @param {Array.<string>} props
   * @return {string}
   */
  $propKey(props) {
    switch (props.length) {
      case 1: return this[props[0]] + '';
      case 2: return this[props[0]] + ',' + this[props[1]];
      case 3: return this[props[0]] + ',' + this[props[1]] + ',' + this[props[2]];
      default: {
        let key = '';

        for (let i = 0, l = props.length; i < l; ++i) {
          key += this[props[i]] + ((i < props.length - 1) ? ',' : '');
        }

        return key;
      }
    }
  }

  /**
   * @return {Model}
   */
  $clone() {
    const clone = new this.constructor();
    const keys = Object.keys(this);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const value = this[key];

      if (_.isObject(value)) {
        clone[key] = cloneObject(value);
      } else {
        clone[key] = value;
      }
    }

    if (this.$omitFromDatabaseJson()) {
      clone.$omitFromDatabaseJson(this.$omitFromDatabaseJson());
    }

    if (this.$omitFromJson()) {
      clone.$omitFromJson(this.$omitFromJson());
    }

    if (this.$stashedQueryProps()) {
      clone.$stashedQueryProps(this.$stashedQueryProps());
    }

    return clone;
  }

  /**
   * @param {Array.<string>=} keys
   * @returns {Array.<string>}
   */
  @hiddenData({name: 'omitFromJson', append: true})
  $omitFromJson(keys) {}

  /**
   * @param {Array.<string>=} keys
   * @returns {Array.<string>}
   */
  @hiddenData({name: 'omitFromDatabaseJson', append: true})
  $omitFromDatabaseJson(keys) {}

  /**
   * @param {Object=} queryProps
   * @returns {Object}
   */
  @hiddenData('stashedQueryProps')
  $stashedQueryProps(queryProps) {}

  /**
   * @protected
   */
  $$toJson(createDbJson, omit, pick) {
    let json = toJsonImpl(this, createDbJson, omit, pick);

    if (createDbJson) {
      return this.$formatDatabaseJson(json);
    } else {
      return this.$formatJson(json);
    }
  }

  /**
   * @param {function=} subclassConstructor
   * @return {Constructor.<Model>}
   */
  static extend(subclassConstructor) {
    if (_.isEmpty(subclassConstructor.name)) {
      throw new Error('Each Model subclass constructor must have a name');
    }

    inherits(subclassConstructor, this);
    return subclassConstructor;
  }

  /**
   * @param {Object=} json
   * @param {ModelOptions=} options
   * @returns {Model}
   * @throws ValidationError
   */
  static fromJson(json, options) {
    let model = new this();
    model.$setJson(json || {}, options);
    return model;
  }

  /**
   * @param {Object=} json
   * @returns {Model}
   */
  static fromDatabaseJson(json) {
    let model = new this();
    model.$setDatabaseJson(json || {});
    return model;
  }

  /**
   * @param {Object} obj
   * @param {string} prop
   */
  static omitImpl(obj, prop) {
    delete obj[prop];
  }

  /**
   * @return {Validator}
   */
  static createValidator() {
    return new AjvValidator({
      onCreateAjv: (ajv) => { /* Do Nothing by default */ },
      options: {
        allErrors: true,
        validateSchema: false,
        ownProperties: true,
        v5: true
      }
    });
  }

  /**
   * @return {Validator}
   */
  @memoize
  static getValidator() {
    return this.createValidator();
  }

  /**
   * @return {Object}
   */
  @memoize
  static getJsonSchema() {
    // Memoized getter in case jsonSchema is a getter property (usually is with ES6).
    return this.jsonSchema;
  }

  /**
   * @param {string} columnName
   * @returns {string}
   */
  @memoize
  static columnNameToPropertyName(columnName) {
    let model = new this();
    let addedProps = _.keys(model.$parseDatabaseJson({}));

    let row = {};
    row[columnName] = null;

    let props = _.keys(model.$parseDatabaseJson(row));
    let propertyName = _.first(_.difference(props, addedProps));

    return propertyName || null;
  }

  /**
   * @param {string} propertyName
   * @returns {string}
   */
  @memoize
  static propertyNameToColumnName(propertyName) {
    let model = new this();
    let addedCols = _.keys(model.$formatDatabaseJson({}));

    let obj = {};
    obj[propertyName] = null;

    let cols = _.keys(model.$formatDatabaseJson(obj));
    let columnName = _.first(_.difference(cols, addedCols));

    return columnName || null;
  }

  /**
   * @param {Transaction=} trx
   * @returns {QueryBuilder}
   */
  static query(trx) {
    const ModelClass = this;

    return ModelClass.QueryBuilder
      .forClass(ModelClass)
      .transacting(trx)
      .relateOperationFactory(() => {
        throw new Error('`relate` makes no sense in this context');
      })
      .unrelateOperationFactory(() => {
        throw new Error('`unrelate` makes no sense in this context');
      });
  }

  /**
   * @param {knex=} knex
   * @returns {knex}
   */
  static knex(knex) {
    if (arguments.length) {
      this.$$knex = knex;
    } else {
      return this.$$knex;
    }
  }

  /**
   * @returns {knex}
   */
  static transaction() {
    return this.knex();
  }

  /**
   * @return {Raw}
   */
  static raw() {
    const knex = this.knex();
    return knex.raw.apply(knex, arguments);
  }

  /**
   * @return {Object}
   */
  static fn() {
    const knex = this.knex();
    return knex.fn;
  }

  /**
   * @return {Formatter}
   */
  static formatter() {
    return this.knex().client.formatter();
  }

  /**
   * @returns {knex.QueryBuilder}
   */
  static knexQuery() {
    return this.knex().table(this.tableName);
  }

  /**
   * @returns {string}
   */
  static uniqueTag() {
    return this.tableName;
  }

  /**
   * @param {knex} knex
   * @returns {Constructor.<Model>}
   */
  static bindKnex(knex) {
    const ModelClass = this;

    if (!knex.$$objection) {
      Object.defineProperty(knex, '$$objection', {
        enumerable: false,
        writable: false,
        value: {
          boundModels: Object.create(null)
        }
      });
    }

    // Check if this model class has already been bound to the given knex.
    if (knex.$$objection.boundModels[ModelClass.uniqueTag()]) {
      return knex.$$objection.boundModels[ModelClass.uniqueTag()];
    }

    // Create a new subclass of this class.
    const BoundModelClass = inheritModel(ModelClass);

    // The bound model is equal to the source model in every way. We want to copy
    // the hidden data as-is from the source so that we don't get the performance
    // penalty of calculating all memoized etc. values again.
    inheritHiddenData(ModelClass, BoundModelClass);

    BoundModelClass.knex(knex);
    knex.$$objection.boundModels[ModelClass.uniqueTag()] = BoundModelClass;

    const boundRelations = Object.create(null);
    const relations = ModelClass.getRelationArray();

    for (let i = 0, l = relations.length; i < l; ++i) {
      const relation = relations[i];
      boundRelations[relation.name] = relation.bindKnex(knex);
    }

    BoundModelClass.relations = boundRelations;
    BoundModelClass.relationArray = _.values(boundRelations);

    return BoundModelClass;
  }

  /**
   * @param {knex} trx
   * @returns {Constructor.<Model>}
   */
  static bindTransaction(trx) {
    return this.bindKnex(trx);
  }

  /**
   * @param {Model|Object} model
   * @param {ModelOptions=} options
   * @returns {Model}
   */
  static ensureModel(model, options) {
    const ModelClass = this;

    if (!model) {
      return null;
    }

    if (model instanceof ModelClass) {
      return model;
    } else {
      return ModelClass.fromJson(model, options);
    }
  }

  /**
   * @param {Array.<Model|Object>} input
   * @param {ModelOptions=} options
   * @returns {Array.<Model>}
   */
  static ensureModelArray(input, options) {
    if (!input) {
      return [];
    }

    if (Array.isArray(input)) {
      let models = new Array(input.length);

      for (var i = 0, l = input.length; i < l; ++i) {
        models[i] = this.ensureModel(input[i], options);
      }

      return models;
    } else {
      return [this.ensureModel(input, options)];
    }
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  static getIdColumnArray() {
    if (Array.isArray(this.idColumn)) {
      return this.idColumn;
    } else {
      return [this.idColumn];
    }
  }

  /**
   * @returns {string|Array.<string>}
   */
  @memoize
  static getFullIdColumn() {
    if (Array.isArray(this.idColumn)) {
      return this.idColumn.map(col => this.tableName + '.' + col);
    } else {
      return this.tableName + '.' + this.idColumn;
    }
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  static getIdPropertyArray() {
    return this.getIdColumnArray().map(col => idColumnToIdProperty(this, col));
  }

  /**
   * @returns {string|Array.<string>}
   */
  @memoize
  static getIdProperty() {
    if (Array.isArray(this.idColumn)) {
      return this.idColumn.map(col => idColumnToIdProperty(this, col));
    } else {
      return idColumnToIdProperty(this, this.idColumn);
    }
  }

  /**
   * @private
   */
  @hiddenData()
  static get relations() {}

  /**
   * @private
   */
  @hiddenData()
  static get relationArray() {}

  /**
   * @private
   */
  @hiddenData()
  static set relations(value) {}

  /**
   * @private
   */
  @hiddenData()
  static set relationArray(value) {}

  /**
   * @return {Object.<string, Relation>}
   */
  static getRelations() {
    let relations = this.relations;

    if (!relations) {
      relations = _.reduce(_.result(this, 'relationMappings'), (relations, mapping, relationName) => {
        relations[relationName] = new mapping.relation(relationName, this);
        relations[relationName].setMapping(mapping);
        return relations;
      }, Object.create(null));

      this.relations = relations;
    }

    return relations;
  }

  /**
   * @return {Array.<Relation>}
   */
  static getRelationArray() {
    let relationArray = this.relationArray;

    if (!relationArray) {
      relationArray = _.values(this.getRelations());
      this.relationArray = relationArray;
    }

    return relationArray;
  }

  /**
   * @return {Relation}
   */
  static getRelation(name) {
    const relation = this.getRelations()[name];

    if (!relation) {
      throw new Error(`A model class (tableName = ${this.tableName}) doesn't have relation ${name}`);
    }

    return relation;
  }

  /**
   * @param {Array.<Model|Object>} $models
   * @param {string|RelationExpression} expression
   * @param {Object.<string, function(QueryBuilder)>=} filters
   * @returns {QueryBuilder}
   */
  static loadRelated($models, expression, filters) {
    return this
      .query()
      .resolve(this.ensureModelArray($models))
      .findOptions({dontCallAfterGet: true})
      .eager(expression, filters)
      .runAfter(function (models) {
        return Array.isArray($models) ? models : models[0];
      });
  }

  /**
   * @param {Constructor.<Model>=} filterConstructor
   * @param {Model|Array.<Model>} models
   * @param {function(Model, Model, string)} traverser
   * @return {Model}
   */
  static traverse(filterConstructor, models, traverser) {
    filterConstructor = filterConstructor || null;

    if (_.isUndefined(traverser)) {
      traverser = models;
      models = filterConstructor;
      filterConstructor = null;
    }

    if (!_.isFunction(traverser)) {
      throw new Error('traverser must be a function');
    }

    if (!models) {
      return;
    }

    const modelClass = Array.isArray(models)
      ? models[0].constructor
      : models.constructor;

    visitModels(models, modelClass, (model, modelClass, parent, relation) => {
      if (!filterConstructor || model instanceof filterConstructor) {
        traverser(model, parent, relation && relation.name);
      }
    });

    return this;
  }

  /**
   * @protected
   * @returns {Array.<string>}
   */
  static getJsonAttributes() {
    // If the jsonAttributes property is not set, try to create it based
    // on the jsonSchema. All properties that are objects or arrays must
    // be converted to JSON.
    if (!this.jsonAttributes && this.getJsonSchema()) {
      this.jsonAttributes = [];

      _.forOwn(this.getJsonSchema().properties, (prop, propName) => {
        var types = _.compact(ensureArray(prop.type));

        if (types.length === 0 && Array.isArray(prop.anyOf)) {
          types = _.flattenDeep(_.map(prop.anyOf, 'type'));
        }

        if (types.length === 0 && Array.isArray(prop.oneOf)) {
          types = _.flattenDeep(_.map(prop.oneOf, 'type'));
        }

        if (_.includes(types, 'object') || _.includes(types, 'array')) {
          this.jsonAttributes.push(propName);
        }
      });
    }

    if (!Array.isArray(this.jsonAttributes)) {
      this.jsonAttributes = [];
    }

    return this.jsonAttributes;
  }
}

function setId(model, id) {
  const idProp = model.constructor.getIdProperty();
  const isArray = Array.isArray(idProp);

  if (Array.isArray(id)) {
    if (isArray) {
      if (id.length !== idProp.length) {
        throw new Error('trying to set an invalid identifier for a model');
      }

      for (let i = 0; i < id.length; ++i) {
        model[idProp[i]] = id[i];
      }
    } else {
      if (id.length !== 1) {
        throw new Error('trying to set an invalid identifier for a model');
      }

      model[idProp] = id[0];
    }
  } else {
    if (isArray) {
      if (idProp.length > 1) {
        throw new Error('trying to set an invalid identifier for a model');
      }

      model[idProp[0]] = id;
    } else {
      model[idProp] = id;
    }
  }
}

function getId(model) {
  const idProp = model.constructor.getIdProperty();

  if (Array.isArray(idProp)) {
    return model.$values(idProp);
  } else {
    return model[idProp];
  }
}

function tryParseJson(maybeJsonStr) {
  try {
    return JSON.parse(maybeJsonStr);
  } catch (err) {
    // Ignore error.
  }

  return undefined;
}

function toJsonImpl(model, createDbJson, omit, pick) {
  if (createDbJson) {
    return toDatabaseJsonImpl(model, omit, pick);
  } else {
    return toExternalJsonImpl(model, omit, pick);
  }
}

function toDatabaseJsonImpl(model, omit, pick) {
  let json = {};
  const omitFromJson = model.$omitFromDatabaseJson();
  const stash = model.$stashedQueryProps();

  if (stash) {
    const keys = Object.keys(stash);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      json[key] = stash[key];
    }
  }

  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    assignJsonValue(json, key, model[key], omit, pick, omitFromJson, true);
  }

  return json;
}

function toExternalJsonImpl(model, omit, pick) {
  const json = {};
  const omitFromJson = model.$omitFromJson();
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    assignJsonValue(json, key, model[key], omit, pick, omitFromJson, false);
  }

  if (model.constructor.virtualAttributes) {
    const vAttr = model.constructor.virtualAttributes;

    for (let i = 0, l = vAttr.length; i < l; ++i) {
      const key = vAttr[i];
      let value = model[key];

      if (_.isFunction(value)) {
        value = value.call(model);
      }

      assignJsonValue(json, key, value, omit, pick, omitFromJson, false);
    }
  }

  return json;
}

function assignJsonValue(json, key, value, omit, pick, omitFromJson, createDbJson) {
  if (key.charAt(0) !== '$'
    && !_.isFunction(value)
    && !_.isUndefined(value)
    && (!omit || !omit[key])
    && (!pick || pick[key])
    && (!omitFromJson || !contains(omitFromJson, key))) {

    if (value !== null && typeof value === 'object') {
      json[key] = toJsonObject(value, createDbJson);
    } else {
      json[key] = value;
    }
  }
}

function toJsonObject(value, createDbJson) {
  if (Array.isArray(value)) {
    return toJsonArray(value, createDbJson);
  } else if (value instanceof Model) {
    if (createDbJson) {
      return value.$toDatabaseJson();
    } else {
      return value.$toJson();
    }
  } else if (Buffer.isBuffer(value)) {
    return value;
  } else {
    return _.cloneDeep(value);
  }
}

function toJsonArray(value, createDbJson) {
  const ret = new Array(value.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    ret[i] = toJsonObject(value[i], createDbJson)
  }

  return ret;
}

function cloneObject(value) {
  if (Array.isArray(value)) {
    return cloneArray(value);
  } else if (value instanceof Model) {
    return value.$clone();
  } else if (Buffer.isBuffer(value)) {
    return new Buffer(value);
  } else {
    return _.cloneDeep(value);
  }
}

function cloneArray(value) {
  const ret = new Array(value.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    ret[i] = cloneObject(value[i])
  }

  return ret;
}

function omitObject(model, keyObj) {
  const ModelClass = model.constructor;
  const keys = Object.keys(keyObj);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = keyObj[key];

    if (value && key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function omitArray(model, keys) {
  const ModelClass = model.constructor;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function pickObject(model, keyObj) {
  const ModelClass = model.constructor;
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && !keyObj[key]) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function pickArray(model, pick) {
  const ModelClass = model.constructor;
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && !contains(pick, key)) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function contains(arr, value) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    if (arr[i] === value) {
      return true;
    }
  }
  return false;
}

function ensureArray(obj) {
  if (Array.isArray(obj)) {
    return obj;
  } else {
    return [obj];
  }
}

function idColumnToIdProperty(ModelClass, idColumn) {
  let idProperty = ModelClass.columnNameToPropertyName(idColumn);

  if (!idProperty) {
    throw new Error(ModelClass.tableName + '.$parseDatabaseJson probably changes the value of the id column `' + idColumn + '` which is a no-no.');
  }

  return idProperty;
}