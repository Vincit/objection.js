'use strict';

const $id = require('./modelId').$id;
const $set = require('./modelSet').$set;
const $omit = require('./modelFilter').$omit;
const $pick = require('./modelFilter').$pick;
const $hasId = require('./modelId').$hasId;
const $clone = require('./modelClone').$clone;
const $toJson = require('./modelToJson').$toJson;
const $values = require('./modelValues').$values;
const $setJson = require('./modelSet').$setJson;
const $propKey = require('./modelValues').$propKey;
const $validate = require('./modelValidate').$validate;
const $toDatabaseJson = require('./modelToJson').$toDatabaseJson;
const $setDatabaseJson = require('./modelSet').$setDatabaseJson;

const bindKnex = require('./modelBindKnex').bindKnex;
const visitModels = require('./modelVisitor').visitModels;
const AjvValidator = require('./AjvValidator');
const QueryBuilder = require('../queryBuilder/QueryBuilder');
const NotFoundError = require('./NotFoundError');
const ValidationError = require('./ValidationError');
const parseJsonAttributes = require('./modelJsonAttributes').parseJsonAttributes;
const formatJsonAttributes = require('./modelJsonAttributes').formatJsonAttributes;
const idColumnToIdProperty = require('./modelColPropMap').idColumnToIdProperty;
const columnNameToPropertyName = require('./modelColPropMap').columnNameToPropertyName;
const propertyNameToColumnName = require('./modelColPropMap').propertyNameToColumnName;
const defineNonEnumerableProperty = require('./modelUtils').defineNonEnumerableProperty;

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
const NaiveEagerOperation = require('../queryBuilder/operations/eager/NaiveEagerOperation');
const WhereInEagerOperation = require('../queryBuilder/operations/eager/WhereInEagerOperation');

const JoinEagerAlgorithm = () => {
  return new JoinEagerOperation('eager');
};

const NaiveEagerAlgorithm = () => {
  return new NaiveEagerOperation('eager');
};

const WhereInEagerAlgorithm = () => {
  return new WhereInEagerOperation('eager');
};

class Model {

  get $isObjectionModel() {
    return true;
  }

  get $objectionModelClass() {
    return Model;
  }

  $id() {
    return $id.apply(this, arguments);
  }

  $hasId() {
    return $hasId.apply(this, arguments);
  }

  $query(trx) {
    const ModelClass = this.constructor;

    return ModelClass
      .query(trx)
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

  $relatedQuery(relationName, trx) {
    const ModelClass = this.constructor;
    const relation = ModelClass.getRelation(relationName);
    const RelatedModelClass = relation.relatedModelClass;

    return RelatedModelClass
      .query(trx)
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

  $loadRelated(relationExpression, filters) {
    return this.constructor.loadRelated(this, relationExpression, filters);
  }

  $beforeValidate(jsonSchema, json, options) {
    /* istanbul ignore next */
    return jsonSchema;
  }

  $validate(json, options) {
    return $validate.call(this, json, options);
  }

  $afterValidate(json, options) {
    // Do nothing by default.
  }

  $parseDatabaseJson(json) {
    return parseJsonAttributes(json, this.constructor);
  }

  $formatDatabaseJson(json) {
    return formatJsonAttributes(json, this.constructor);
  }

  $parseJson(json, options) {
    return json;
  }

  $formatJson(json) {
    return json;
  }

  $setJson(json, options) {
    return $setJson.call(this, json, options);
  }

  $setDatabaseJson(json) {
    return $setDatabaseJson.call(this, json);
  }

  $set(obj) {
    return $set.call(this, obj);
  }

  $toJson(shallow) {
    return $toJson.call(this, shallow);
  }

  toJSON() {
    return $toJson.call(this, false);
  }

  $toDatabaseJson() {
    return $toDatabaseJson.call(this);
  }

  $beforeInsert(queryContext) {
    // Do nothing by default.
  }

  $afterInsert(queryContext) {
    // Do nothing by default.
  }

  $beforeUpdate(opt, queryContext) {
    // Do nothing by default.
  }

  $afterUpdate(opt, queryContext) {
    // Do nothing by default.
  }

  $afterGet(queryContext) {
    // Do nothing by default.
  }

  $beforeDelete(queryContext) {
    // Do nothing by default.
  }

  $afterDelete(queryContext) {
    // Do nothing by default.
  }

  $omit() {
    return $omit.apply(this, arguments);
  }

  $pick() {
    return $pick.apply(this, arguments);
  }

  $values(props) {
    return $values.call(this, props);
  }

  $propKey(props) {
    return $propKey.call(this, props);
  }

  $clone(shallow) {
    return $clone.call(this, shallow);
  }

  $traverse(filterConstructor, callback) {
    if (callback === undefined) {
      callback = filterConstructor;
      filterConstructor = null;
    }

    this.constructor.traverse(filterConstructor, this, callback);
    return this;
  }

  $omitFromJson(props) {
    if (arguments.length === 0) {
      return this.$$omitFromJson;
    } else {
      if (!this.hasOwnProperty('$$omitFromJson')) {
        defineNonEnumerableProperty(this, '$$omitFromJson', props);
      } else {
        this.$$omitFromJson = this.$$omitFromJson.concat(props);
      }
    }
  }

  $omitFromDatabaseJson(props) {
    if (arguments.length === 0) {
      return this.$$omitFromDatabaseJson;
    } else {
      if (!this.hasOwnProperty('$$omitFromDatabaseJson')) {
        defineNonEnumerableProperty(this, '$$omitFromDatabaseJson', props);
      } else {
        this.$$omitFromDatabaseJson = this.$$omitFromDatabaseJson.concat(props);
      }
    }
  }

  $knex() {
    return this.constructor.knex();
  }

  $transaction() {
    return this.constructor.transaction();
  }

  static get objectionModelClass() {
    return Model;
  }

  static fromJson(json, options) {
    const model = new this();
    model.$setJson(json || {}, options);
    return model;
  }

  static fromDatabaseJson(json) {
    const model = new this();
    model.$setDatabaseJson(json || {});
    return model;
  }

  static omitImpl(obj, prop) {
    delete obj[prop];
  }

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

  static createNotFoundError(ctx) {
    return new this.NotFoundError();
  }

  static createValidationError(errors) {
    return new this.ValidationError(errors);
  }

  static getValidator() {
    // Memoize the validator but only for this class. The hasOwnProperty check
    // will fail for subclasses and the validator gets recreated.
    if (!this.hasOwnProperty('$$validator')) {
      defineNonEnumerableProperty(this, '$$validator', this.createValidator());
    }

    return this.$$validator;
  }

  static getJsonSchema() {
    // Memoize the jsonSchema but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$jsonSchema')) {
      // this.jsonSchema is often a getter that returns a new object each time. We need
      // memoize it to make sure we get the same instance each time.
      defineNonEnumerableProperty(this, '$$jsonSchema', this.jsonSchema);
    }

    return this.$$jsonSchema;
  }

  static columnNameToPropertyName(columnName) {
    // Memoize the converted names but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$colToProp')) {
      defineNonEnumerableProperty(this, '$$colToProp', Object.create(null));
    }

    if (!this.$$colToProp[columnName]) {
      this.$$colToProp[columnName] = columnNameToPropertyName(this, columnName);
    }

    return this.$$colToProp[columnName];
  }

  static propertyNameToColumnName(propertyName) {
    // Memoize the converted names but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$propToCol')) {
      defineNonEnumerableProperty(this, '$$propToCol', Object.create(null));
    }

    if (!this.$$propToCol[propertyName]) {
      this.$$propToCol[propertyName] = propertyNameToColumnName(this, propertyName);
    }

    return this.$$propToCol[propertyName];
  }

  static getIdColumnArray() {
    // Memoize getIdColumnArray but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$idColumnArray')) {
      defineNonEnumerableProperty(this, '$$idColumnArray', getIdColumnArray(this));
    }

    return this.$$idColumnArray;
  }

  static getIdPropertyArray() {
    // Memoize getIdPropertyArray but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$idPropertyArray')) {
      defineNonEnumerableProperty(this, '$$idPropertyArray', getIdPropertyArray(this));
    }

    return this.$$idPropertyArray;
  }

  static getIdProperty() {
    // Memoize getIdProperty but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$idProperty')) {
      defineNonEnumerableProperty(this, '$$idProperty', getIdProperty(this));
    }

    return this.$$idProperty;
  }

  static getReadOnlyVirtualAttributes() {
    // Memoize getReadOnlyVirtualAttributes but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$readOnlyVirtualAttributes')) {
      defineNonEnumerableProperty(this, '$$readOnlyVirtualAttributes', getReadOnlyVirtualAttributes(this));
    }

    return this.$$readOnlyVirtualAttributes;
  }

  static getRelations() {
    // Memoize relations but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$relations')) {
      const relationMappings = typeof this.relationMappings === 'function' 
        ? this.relationMappings() 
        : this.relationMappings;

      const relations = Object.keys(relationMappings || {}).reduce((relations, relationName) => {
        const mapping = relationMappings[relationName];

        relations[relationName] = new mapping.relation(relationName, this);
        relations[relationName].setMapping(mapping);
        
        return relations;
      }, Object.create(null));

      defineNonEnumerableProperty(this, '$$relations', relations);
    }

    return this.$$relations;
  }

  static getRelationArray() {
    // Memoize relation array but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$relationArray')) {
      defineNonEnumerableProperty(this, '$$relationArray', getRelationArray(this));
    }

    return this.$$relationArray;
  }

  static query(trx) {
    const ModelClass = this;

    return ModelClass.QueryBuilder
      .forClass(ModelClass)
      .transacting(trx);
  }

  static knex() {
    if (arguments.length) {
      defineNonEnumerableProperty(this, '$$knex', arguments[0]);
    } else {
      return this.$$knex;
    }
  }

  static transaction() {
    return this.knex();
  }

  static raw() {
    const knex = this.knex();
    return knex.raw.apply(knex, arguments);
  }

  static fn() {
    const knex = this.knex();
    return knex.fn;
  }

  static formatter() {
    return this.knex().client.formatter();
  }

  static knexQuery() {
    return this.knex().table(this.tableName);
  }

  static uniqueTag() {
    if (this.name) {
      return `${this.tableName}_${this.name}`;
    } else {
      return this.tableName;
    }
  }

  static bindKnex(knex) {
    return bindKnex(this, knex);
  }

  static bindTransaction(trx) {
    return bindKnex(this, trx);
  }

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

  static getRelation(name) {
    const relation = this.getRelations()[name];

    if (!relation) {
      throw new Error(`A model class ${this.name} doesn't have relation ${name}`);
    }

    return relation;
  }

  static loadRelated($models, expression, filters) {
    return this
      .query()
      .resolve(this.ensureModelArray($models))
      .findOptions({dontCallAfterGet: true})
      .eager(expression, filters)
      .runAfter(models => Array.isArray($models) ? models : models[0]);
  }

  static traverse(filterConstructor, models, traverser) {
    filterConstructor = filterConstructor || null;

    if (traverser === undefined) {
      traverser = models;
      models = filterConstructor;
      filterConstructor = null;
    }

    if (typeof traverser !== 'function') {
      throw new Error('traverser must be a function');
    }

    if (!models || (Array.isArray(models) && !models.length)) {
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
}

Model.QueryBuilder = QueryBuilder;

Model.HasOneRelation = HasOneRelation;
Model.HasManyRelation = HasManyRelation;
Model.ManyToManyRelation = ManyToManyRelation;
Model.BelongsToOneRelation = BelongsToOneRelation;
Model.HasOneThroughRelation = HasOneThroughRelation;

Model.JoinEagerAlgorithm = JoinEagerAlgorithm;
Model.NaiveEagerAlgorithm = NaiveEagerAlgorithm;
Model.WhereInEagerAlgorithm = WhereInEagerAlgorithm;

Model.ValidationError = ValidationError;
Model.NotFoundError = NotFoundError;

Model.tableName = null;
Model.jsonSchema = null;
Model.idColumn = 'id';
Model.uidProp = '#id';
Model.uidRefProp = '#ref';
Model.dbRefProp = '#dbRef';
Model.propRefRegex = /#ref{([^\.]+)\.([^}]+)}/g;
Model.jsonAttributes = null;
Model.virtualAttributes = null;
Model.relationMappings = null;
Model.modelPaths = [];
Model.pickJsonSchemaProperties = false;
Model.defaultEagerAlgorithm = WhereInEagerAlgorithm;
Model.defaultEagerOptions = null;
Model.namedFilters = null;
Model.useLimitInFirst = false;

function getIdColumnArray(ModelClass) {
  if (Array.isArray(ModelClass.idColumn)) {
    return ModelClass.idColumn;
  } else {
    return [ModelClass.idColumn];
  }
}

function getIdPropertyArray(ModelClass) {
  return ModelClass.getIdColumnArray().map(col => idColumnToIdProperty(ModelClass, col));
}

function getIdProperty(ModelClass) {
  if (Array.isArray(ModelClass.idColumn)) {
    return ModelClass.idColumn.map(col => idColumnToIdProperty(ModelClass, col));
  } else {
    return idColumnToIdProperty(ModelClass, ModelClass.idColumn);
  }
}

function getReadOnlyVirtualAttributes(ModelClass) {
  const virtuals = ModelClass.virtualAttributes;

  if (!Array.isArray(virtuals)) {
    return null;
  }

  return virtuals.filter(virtual => {
    const desc = Object.getOwnPropertyDescriptor(ModelClass.prototype, virtual);

    if (!desc) {
      return false;
    }

    return (desc.get && !desc.set) || desc.writable === false || typeof desc.value === 'function';
  });
}

function getRelationArray(ModelClass) {
  const relations = ModelClass.getRelations();
  return Object.keys(relations).map(key => relations[key]);
}

module.exports = Model;