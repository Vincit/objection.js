'use strict';

const _ = require('lodash');
const AjvValidator = require('./AjvValidator');
const QueryBuilder = require('../queryBuilder/QueryBuilder');
const inheritModel = require('./inheritModel');
const RelationExpression = require('../queryBuilder/RelationExpression');
const visitModels = require('./modelVisitor').visitModels;

const decorate = require('../utils/decorators/decorate');
const inherits = require('../utils/classUtils').inherits;
const inheritHiddenData = require('../utils/hiddenData').inheritHiddenData;
const hiddenData = require('../utils/decorators/hiddenData');
const memoize = require('../utils/decorators/memoize');

const Relation = require('../relations/Relation');
const HasOneRelation = require('../relations/hasOne/HasOneRelation');
const HasManyRelation = require('../relations/hasMany/HasManyRelation');
const ManyToManyRelation = require('../relations/manyToMany/ManyToManyRelation');
const BelongsToOneRelation = require('../relations/belongsToOne/BelongsToOneRelation');
const HasOneThroughRelation = require('../relations/hasOneThrough/HasOneThroughRelation');

const InstanceFindOperation = require('../queryBuilder/operations/InstanceFindOperation');
const InstanceInsertOperation = require('../queryBuilder/operations/InstanceInsertOperation');
const InstanceUpdateOperation = require('../queryBuilder/operations/InstanceUpdateOperation');
const InstanceDeleteOperation = require('../queryBuilder/operations/InstanceDeleteOperation');

const JoinEagerOperation = require('../queryBuilder/operations/eager/JoinEagerOperation');
const WhereInEagerOperation = require('../queryBuilder/operations/eager/WhereInEagerOperation');

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
 * @property {boolean} [mutable]
 * @property {Model} [old]
 */

class Model {

  /**
   * @return {boolean}
   */
  get isObjectionModel() {
    return true;
  }

  /**
   * @return {boolean}
   */
  get objectionModelClass() {
    return Model;
  }

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
  $validate(json, options) {
    json = json || this;
    options = options || {};

    if (json instanceof Model) {
      // Strip away relations and other internal stuff.
      json = cloneModel(json, true, true);
      // We can mutate `json` now that we took a copy of it.
      options.mutable = true;
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
      // JSON attributes may be returned as strings depending on the database and
      // the database client. Convert them to objects here.
      for (let i = 0, l = jsonAttr.length; i < l; ++i) {
        const attr = jsonAttr[i];
        const value = json[attr];

        if (typeof value === 'string') {
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
      // All database clients want JSON columns as strings. Do the conversion here.
      for (let i = 0, l = jsonAttr.length; i < l; ++i) {
        const attr = jsonAttr[i];
        const value = json[attr];

        if (_.isObject(value)) {
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
  $setJson(json, options) {
    json = json || {};
    options = options || {};

    if (Object.prototype.toString.call(json) !== '[object Object]') {
      throw new Error('You should only pass objects to $setJson method. '
        + '$setJson method was given an invalid value '
        + json);
    }

    json = this.$parseJson(json, options);
    json = this.$validate(json, options);
    this.$set(json);

    const relations = this.constructor.getRelationArray();
    // Parse relations into Model instances.
    for (let i = 0, l = relations.length; i < l; ++i) {
      const relation = relations[i];
      const relationName = relation.name;
      const relationJson = json[relationName];

      if (relationJson !== undefined) {
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
    return this.$toJson(false);
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
      const keys = new Array(arguments.length);

      for (let i = 0, l = keys.length; i < l; ++i) {
        keys[i] = arguments[i];
      }

      omitArray(this, keys);
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
      const keys = new Array(arguments.length);

      for (let i = 0, l = keys.length; i < l; ++i) {
        keys[i] = arguments[i];
      }

      pickArray(this, keys);
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
      if (arguments.length === 1 && Array.isArray(arguments[0])) {
        return this.$$values(arguments[0]);
      } else {
        const args = new Array(arguments.length);

        for (let i = 0, l = args.length; i < l; ++i) {
          args[i] = arguments[i];
        }

        return this.$$values(args);
      }
    }
  }

  /**
   * @private
   */
  $$values(args) {
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
   * @param {boolean} shallow
   * @return {Model}
   */
  $clone(shallow) {
    return cloneModel(this, shallow, false);
  }

  /**
   * @param {Array.<string>=} keys
   * @returns {Array.<string>}
   */
  $omitFromJson(keys) {
    // Implemented by a decorator.
  }

  /**
   * @param {Array.<string>=} keys
   * @returns {Array.<string>}
   */
  $omitFromDatabaseJson(keys) {
    // Implemented by a decorator.
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
  static getValidator() {
    return this.createValidator();
  }

  /**
   * @return {Object}
   */
  static getJsonSchema() {
    return this.jsonSchema;
  }

  /**
   * @param {string} columnName
   * @returns {string}
   */
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
  static knex() {
    if (arguments.length) {
      // We cannot save this to hiddenData because values
      // in there don't get inherited automatically when
      // a class is inherited.
      Object.defineProperty(this, '$$knex', {
        enumerable: false,
        writable: true,
        value: arguments[0]
      })
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

    BoundModelClass.relations(boundRelations);
    BoundModelClass.relationArray(_.values(boundRelations));

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
  static getIdPropertyArray() {
    return this.getIdColumnArray().map(col => idColumnToIdProperty(this, col));
  }

  /**
   * @returns {string|Array.<string>}
   */
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
  static relations() {
    // Implemented by a decorator.
  }

  /**
   * @private
   */
  static relationArray() {
    // Implemented by a decorator.
  }

  /**
   * @return {Object.<string, Relation>}
   */
  static getRelations() {
    let relations = this.relations();

    if (!relations) {
      relations = _.reduce(_.result(this, 'relationMappings'), (relations, mapping, relationName) => {
        relations[relationName] = new mapping.relation(relationName, this);
        relations[relationName].setMapping(mapping);
        return relations;
      }, Object.create(null));

      this.relations(relations);
    }

    return relations;
  }

  /**
   * @return {Array.<Relation>}
   */
  static getRelationArray() {
    let relationArray = this.relationArray();

    if (!relationArray) {
      relationArray = _.values(this.getRelations());
      this.relationArray(relationArray);
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

    if (_.isEmpty(models)) {
      return this;
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

Model.QueryBuilder = QueryBuilder;
Model.RelatedQueryBuilder = QueryBuilder;

Model.HasOneRelation = HasOneRelation;
Model.HasManyRelation = HasManyRelation;
Model.ManyToManyRelation = ManyToManyRelation;
Model.BelongsToOneRelation = BelongsToOneRelation;
Model.HasOneThroughRelation = HasOneThroughRelation;

Model.JoinEagerAlgorithm = JoinEagerAlgorithm;
Model.WhereInEagerAlgorithm = WhereInEagerAlgorithm;

/**
 * @type {string}
 */
Model.tableName = null;

/**
 * @type {Object}
 */
Model.jsonSchema = null;

/**
 * @type {string|Array.<string>}
 */
Model.idColumn = 'id';

/**
 * @type {string}
 */
Model.uidProp = '#id';

/**
 * @type {string}
 */
Model.uidRefProp = '#ref';

/**
 * @type {string}
 */
Model.dbRefProp = '#dbRef';

/**
 * @type {RegExp}
 */
Model.propRefRegex = /#ref{([^\.]+)\.([^}]+)}/g;

/**
 * @type {Array.<string>}
 */
Model.jsonAttributes = null;

/**
 * @type {Array.<string>}
 */
Model.virtualAttributes = null;

/**
 * @type {Object.<string, RelationMapping>}
 */
Model.relationMappings = null;

/**
 * @type {Array.<string>}
 */
Model.modelPaths = [];

/**
 * @type {boolean}
 */
Model.pickJsonSchemaProperties = true;

/**
 * @type {Constructor.<? extends EagerOperation>}
 */
Model.defaultEagerAlgorithm = WhereInEagerAlgorithm;

/**
 * @type {object}
 */
Model.defaultEagerOptions = null;

/**
 * Until node gets decorators, we need to apply them like this.
 */
decorate(Model.prototype, [{
  decorator: hiddenData({name: 'omitFromJson', append: true}),
  properties: [
    '$omitFromJson'
  ]
}, {
  decorator: hiddenData({name: 'omitFromDatabaseJson', append: true}),
  properties: [
    '$omitFromDatabaseJson'
  ]
}]);

/**
 * Until node gets decorators, we need to apply them like this.
 */
decorate(Model, [{
  decorator: memoize,
  properties: [
    'getValidator',
    'getJsonSchema',
    'columnNameToPropertyName',
    'propertyNameToColumnName',
    'getIdColumnArray',
    'getIdProperty',
    'getIdPropertyArray',
    'getFullIdColumn'
  ]
}, {
  decorator: hiddenData(),
  properties: [
    'relations',
    'relationArray'
  ]
}]);

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
  const json = {};
  const omitFromJson = model.$omitFromDatabaseJson();
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
  const vAttr = model.constructor.virtualAttributes;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    assignJsonValue(json, key, value, omit, pick, omitFromJson, false);
  }

  if (vAttr) {
    assignVirtualAttributes(json, model, vAttr, omit, pick, omitFromJson);
  }

  return json;
}

function assignVirtualAttributes(json, model, vAttr, omit, pick, omitFromJson) {
  for (let i = 0, l = vAttr.length; i < l; ++i) {
    const key = vAttr[i];
    let value = model[key];

    if (typeof value === 'function') {
      value = value.call(model);
    }

    assignJsonValue(json, key, value, omit, pick, omitFromJson, false);
  }
}

function assignJsonValue(json, key, value, omit, pick, omitFromJson, createDbJson) {
  const type = typeof value;

  if (key.charAt(0) !== '$'
    && type !== 'function'
    && type !== 'undefined'
    && (!omit || !omit[key])
    && (!pick || pick[key])
    && (!omitFromJson || !contains(omitFromJson, key))) {

    if (value !== null && type === 'object') {
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

function cloneModel(model, shallow, stripInternal) {
  let clone = null;

  const omitFromJson = model.$omitFromJson();
  const omitFromDatabaseJson = model.$omitFromDatabaseJson();

  if (!shallow && !stripInternal) {
    clone = cloneModelSimple(model);
  } else {
    clone = cloneModelWithOpt(model, shallow, stripInternal);
  }

  if (omitFromJson) {
    clone.$omitFromJson(omitFromJson);
  }

  if (omitFromDatabaseJson) {
    clone.$omitFromDatabaseJson(omitFromDatabaseJson);
  }

  return clone;
}

function cloneModelSimple(model) {
  const clone = new model.constructor();
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    if (value !== null && typeof value === 'object') {
      clone[key] = cloneObject(value);
    } else {
      clone[key] = value;
    }
  }

  return clone;
}

function cloneModelWithOpt(model, shallow, stripInternal) {
  const clone = new model.constructor();
  const keys = Object.keys(model);
  const relations = model.constructor.getRelations();

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    if (shallow && relations[key]) {
      continue;
    }

    if (stripInternal && key.charAt(0) === '$') {
      continue;
    }

    if (value !== null && typeof value === 'object') {
      clone[key] = cloneObject(value);
    } else {
      clone[key] = value;
    }
  }

  return clone;
}

function cloneObject(value) {
  if (Array.isArray(value)) {
    return cloneArray(value);
  } else if (value instanceof Model) {
    return cloneModel(value, false, false);
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

module.exports = Model;