import _ from 'lodash';
import ModelBase from './ModelBase';
import QueryBuilder from '../queryBuilder/QueryBuilder';
import inheritModel from './inheritModel';
import RelationExpression from '../queryBuilder/RelationExpression';
import {inheritHiddenData} from '../utils/hiddenData';

import hiddenData from '../utils/decorators/hiddenData';
import deprecated from '../utils/decorators/deprecated';
import memoize from '../utils/decorators/memoize';

import Relation from '../relations/Relation';
import HasOneRelation from '../relations/hasOne/HasOneRelation';
import HasManyRelation from '../relations/hasMany/HasManyRelation';
import ManyToManyRelation from '../relations/manyToMany/ManyToManyRelation';
import BelongsToOneRelation from '../relations/belongsToOne/BelongsToOneRelation';

import InstanceFindOperation from '../queryBuilder/operations/InstanceFindOperation';
import InstanceInsertOperation from '../queryBuilder/operations/InstanceInsertOperation';
import InstanceUpdateOperation from '../queryBuilder/operations/InstanceUpdateOperation';
import InstanceDeleteOperation from '../queryBuilder/operations/InstanceDeleteOperation';

import JoinEagerOperation from '../queryBuilder/operations/JoinEagerOperation';
import WhereInEagerOperation from '../queryBuilder/operations/WhereInEagerOperation';

const JoinEagerAlgorithm = () => {
  return new JoinEagerOperation('eager');
};

const WhereInEagerAlgorithm = () => {
  return new WhereInEagerOperation('eager');
};

export default class Model extends ModelBase {

  static QueryBuilder = QueryBuilder;
  static RelatedQueryBuilder = QueryBuilder;

  static HasOneRelation = HasOneRelation;
  static HasManyRelation = HasManyRelation;
  static ManyToManyRelation = ManyToManyRelation;
  static BelongsToOneRelation = BelongsToOneRelation;

  static JoinEagerAlgorithm = JoinEagerAlgorithm;
  static WhereInEagerAlgorithm = WhereInEagerAlgorithm;

  @deprecated({removedIn: '0.7.0', useInstead: 'BelongsToOneRelation'})
  static get OneToOneRelation() {
    return BelongsToOneRelation;
  }

  @deprecated({removedIn: '0.7.0', useInstead: 'HasManyRelation'})
  static get OneToManyRelation() {
    return HasManyRelation;
  }

  /**
   * @type {string}
   */
  static tableName = null;

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

  $validate(json = this, options = {}) {
    if (json instanceof Model) {
      // Strip away relations and other internal stuff.
      json = json.$parseJson(json.$toJson(true));
    }

    return super.$validate(json, options);
  }

  $parseDatabaseJson(json) {
    const jsonAttr = this.constructor.getJsonAttributes();

    if (jsonAttr.length) {
      for (let i = 0, l = jsonAttr.length; i < l; ++i) {
        const attr = jsonAttr[i];
        const value = json[attr];

        if (_.isString(value)) {
          json[attr] = JSON.parse(value);
        }
      }
    }

    return json;
  }

  $formatDatabaseJson(json) {
    const jsonAttr = this.constructor.getJsonAttributes();

    if (jsonAttr.length) {
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

  $setJson(json, options) {
    super.$setJson(json, options);

    if (!_.isObject(json)) {
      return;
    }

    const relations = this.constructor.getRelations();
    const relNames = Object.keys(relations);

    // Parse relations into Model instances.
    for (let i = 0, l = relNames.length; i < l; ++i) {
      const relationName = relNames[i];

      if (_.has(json, relationName)) {
        const relationJson = json[relationName];
        const relation = relations[relationName];

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
   * @param {boolean=} shallow
   */
  $toJson(shallow) {
    if (shallow) {
      return this.$$toJson(false, this.constructor.getRelations(), null);
    } else {
      return this.$$toJson(false, null, null);
    }
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
    const relations = ModelClass.getRelations();
    const relNames = Object.keys(relations);

    for (let i = 0, l = relNames.length; i < l; ++i) {
      const relName = relNames[i];
      const relation = relations[relName];
      boundRelations[relName] = relation.bindKnex(knex);
    }

    BoundModelClass.relations = boundRelations;
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
  static set relations(value) {}

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

    traverse(models, null, null, filterConstructor, traverser);
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

function ensureArray(obj) {
  if (Array.isArray(obj)) {
    return obj;
  } else {
    return [obj];
  }
}

function traverse(models, parent, relationName, modelClass, callback) {
  if (!_.isObject(models)) {
    return;
  }

  if (Array.isArray(models)) {
    for (var i = 0, l = models.length; i < l; ++i) {
      traverseOne(models[i], parent, relationName, modelClass, callback);
    }
  } else {
    traverseOne(models, parent, relationName, modelClass, callback)
  }
}

function traverseOne(model, parent, relationName, modelClass, callback) {
  if (!(model instanceof Model)) {
    return;
  }

  if (!modelClass || model instanceof modelClass) {
    callback(model, parent, relationName);
  }

  const relations = model.constructor.getRelations();
  const relNames = Object.keys(relations);

  for (let i = 0, l = relNames.length; i < l; ++i) {
    const relName = relNames[i];

    if (model.hasOwnProperty(relName)) {
      traverse(model[relName], model, relName, modelClass, callback);
    }
  }
}

function idColumnToIdProperty(ModelClass, idColumn) {
  let idProperty = ModelClass.columnNameToPropertyName(idColumn);

  if (!idProperty) {
    throw new Error(ModelClass.tableName + '.$parseDatabaseJson probably changes the value of the id column `' + idColumn + '` which is a no-no.');
  }

  return idProperty;
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