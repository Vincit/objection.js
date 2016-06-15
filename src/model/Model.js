import _ from 'lodash';
import ModelBase from './ModelBase';
import QueryBuilder from '../queryBuilder/QueryBuilder';
import inheritModel from './inheritModel';
import RelationExpression from '../queryBuilder/RelationExpression';
import hiddenDataGetterSetter from '../utils/decorators/hiddenDataGetterSetter';
import ValidationError from '../ValidationError';
import EagerFetcher from '../queryBuilder/EagerFetcher';
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

export default class Model extends ModelBase {

  static QueryBuilder = QueryBuilder;
  static RelatedQueryBuilder = QueryBuilder;

  static HasOneRelation = HasOneRelation;
  static HasManyRelation = HasManyRelation;
  static ManyToManyRelation = ManyToManyRelation;
  static BelongsToOneRelation = BelongsToOneRelation;

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
   * @private
   */
  static $$knex = null;

  /**
   * @param {string|number|Array.<string|number>=} id
   * @returns {string|number|Array.<string|number>}
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
   * @returns {QueryBuilder}
   */
  $query() {
    const ModelClass = this.constructor;

    return ModelClass.QueryBuilder
      .forClass(ModelClass)
      .findOperationFactory(builder => {
        return new InstanceFindOperation(builder, 'find', {instance: this});
      })
      .insertOperationFactory(builder => {
        return new InstanceInsertOperation(builder, 'insert', {instance: this});
      })
      .updateOperationFactory(builder => {
        return new InstanceUpdateOperation(builder, 'update', {instance: this});
      })
      .patchOperationFactory(builder => {
        return new InstanceUpdateOperation(builder, 'patch', {instance: this, modelOptions: {patch: true}});
      })
      .deleteOperationFactory(builder => {
        return new InstanceDeleteOperation(builder, 'delete', {instance: this});
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
   * @returns {QueryBuilder}
   */
  $relatedQuery(relationName) {
    const relation = this.constructor.getRelation(relationName);
    const ModelClass = relation.relatedModelClass;

    return ModelClass.RelatedQueryBuilder
      .forClass(ModelClass)
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
   * @returns {Promise}
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

  $parseDatabaseJson(json) {
    const ModelClass = this.constructor;
    const jsonAttr = ModelClass.$$getJsonAttributes();

    if (jsonAttr.length) {
      for (let i = 0, l = jsonAttr.length; i < l; ++i) {
        let attr = jsonAttr[i];
        let value = json[attr];

        if (_.isString(value)) {
          json[attr] = JSON.parse(value);
        }
      }
    }

    return json;
  }

  $formatDatabaseJson(json) {
    const ModelClass = this.constructor;
    const jsonAttr = ModelClass.$$getJsonAttributes();

    if (jsonAttr.length) {
      for (let i = 0, l = jsonAttr.length; i < l; ++i) {
        let attr = jsonAttr[i];
        let value = json[attr];

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
    // Parse relations into Model instances.
    for (let relationName in relations) {
      if (_.has(json, relationName)) {
        let relationJson = json[relationName];
        let relation = relations[relationName];

        if (_.isArray(relationJson)) {
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
    const jsonSchema = this.constructor.jsonSchema;
    const pick = jsonSchema && jsonSchema.properties;
    let omit;

    if (!pick) {
      omit = this.constructor.getRelations();
    }

    return this.$$toJson(true, omit, pick);
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
   * @returns {QueryBuilder}
   */
  static query() {
    const ModelClass = this;

    return ModelClass.QueryBuilder
      .forClass(ModelClass)
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
      let modelClass = this;

      while (modelClass && !modelClass.$$knex) {
        let proto = modelClass.prototype.__proto__;
        modelClass = proto && proto.constructor;
      }

      return modelClass && modelClass.$$knex;
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
   * @param {knex} knex
   * @returns {Constructor.<Model>}
   */
  static bindKnex(knex) {
    const ModelClass = this;

    if (!knex.$$objection) {
      knex.$$objection = {};
      knex.$$objection.id = _.uniqueId();
      knex.$$objection.boundModels = Object.create(null);
    }

    // Check if this model class has already been bound to the given knex.
    if (knex.$$objection.boundModels[ModelClass.tableName]) {
      return knex.$$objection.boundModels[ModelClass.tableName];
    }

    // Create a new subclass of this class.
    let BoundModelClass = inheritModel(ModelClass);

    BoundModelClass.knex(knex);
    knex.$$objection.boundModels[ModelClass.tableName] = BoundModelClass;

    // Bind all relations also.
    BoundModelClass.relations(_.reduce(ModelClass.getRelations(), (relations, relation, relationName) => {
      relations[relationName] = relation.bindKnex(knex);
      return relations;
    }, Object.create(null)));

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
    const ModelClass = this;

    if (!input) {
      return [];
    }

    if (_.isArray(input)) {
      let models = new Array(input.length);

      for (var i = 0, l = input.length; i < l; ++i) {
        models[i] = ModelClass.ensureModel(input[i], options);
      }

      return models;
    } else {
      return [ModelClass.ensureModel(input, options)];
    }
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  static getIdColumnArray() {
    let ModelClass = this;

    if (_.isArray(ModelClass.idColumn)) {
      return ModelClass.idColumn;
    } else {
      return [ModelClass.idColumn];
    }
  }

  /**
   * @returns {Array.<string>}
   */
  @memoize
  static getIdPropertyArray() {
    let ModelClass = this;
    return _.map(ModelClass.getIdColumnArray(), col => idColumnToIdProperty(ModelClass, col));
  }

  /**
   * @returns {string|Array.<string>}
   */
  @memoize
  static getIdProperty() {
    let ModelClass = this;

    if (_.isArray(ModelClass.idColumn)) {
      return _.map(ModelClass.idColumn, col => idColumnToIdProperty(ModelClass, col));
    } else {
      return idColumnToIdProperty(ModelClass, ModelClass.idColumn);
    }
  }

  /**
   * @returns {string|Array.<string>}
   */
  @memoize
  static getFullIdColumn() {
    if (_.isArray(this.idColumn)) {
      return _.map(this.idColumn, col => this.tableName + '.' + col);
    } else {
      return this.tableName + '.' + this.idColumn;
    }
  }

  /**
   * @private
   */
  @hiddenDataGetterSetter('relations')
  static relations(relations) {}

  /**
   * @return {Object.<string, Relation>}
   */
  static getRelations() {
    let relations = this.relations();

    if (!relations) {
      const ModelClass = this;

      relations = _.reduce(this.relationMappings, (relations, mapping, relationName) => {
        relations[relationName] = new mapping.relation(relationName, ModelClass);
        relations[relationName].setMapping(mapping);
        return relations;
      }, Object.create(null));

      this.relations(relations);
    }

    return relations;
  }

  /**
   * @return {Relation}
   */
  static getRelation(name) {
    const relation = this.getRelations()[name];

    if (!relation) {
      throw new Error("model class '" + this.name + "' doesn't have relation '" + name + "'");
    }

    return relation;
  }

  /**
   * @param {Array.<Model|Object>} $models
   * @param {string|RelationExpression} expression
   * @param {Object.<string, function(QueryBuilder)>=} filters
   * @returns {Promise}
   */
  static loadRelated($models, expression, filters) {
    if (!(expression instanceof RelationExpression)) {
      expression = RelationExpression.parse(expression);
    }

    return new EagerFetcher({
      modelClass: this,
      models: this.ensureModelArray($models),
      eager: expression,
      filters: filters
    }).fetch().then(function (models) {
      return _.isArray($models) ? models : models[0];
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
  static $$getJsonAttributes() {
    // If the jsonAttributes property is not set, try to create it based
    // on the jsonSchema. All properties that are objects or arrays must
    // be converted to JSON.
    if (!this.jsonAttributes && this.jsonSchema) {
      this.jsonAttributes = [];

      _.each(this.jsonSchema.properties, (prop, propName) => {
        var types = _.compact(ensureArray(prop.type));

        if (types.length === 0 && _.isArray(prop.anyOf)) {
          types = _.flattenDeep(_.map(prop.anyOf, 'type'));
        }

        if (types.length === 0 && _.isArray(prop.oneOf)) {
          types = _.flattenDeep(_.map(prop.oneOf, 'type'));
        }

        if (_.includes(types, 'object') || _.includes(types, 'array')) {
          this.jsonAttributes.push(propName);
        }
      });
    }

    if (!_.isArray(this.jsonAttributes)) {
      this.jsonAttributes = [];
    }

    return this.jsonAttributes;
  }
}

function ensureArray(obj) {
  if (_.isArray(obj)) {
    return obj;
  } else {
    return [obj];
  }
}

function traverse(models, parent, relationName, modelClass, callback) {
  if (!_.isObject(models)) {
    return;
  }

  if (_.isArray(models)) {
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

  for (var relName in model.constructor.getRelations()) {
    if (_.has(model, relName)) {
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
  const isArray = _.isArray(idProp);

  if (_.isArray(id)) {
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

  if (_.isArray(idProp)) {
    return model.$values(idProp);
  } else {
    return model[idProp];
  }
}