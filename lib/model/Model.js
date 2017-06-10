'use strict';

const cloneDeep = require('lodash/cloneDeep'); 
const difference = require('lodash/difference');
const flattenDeep = require('lodash/flattenDeep');

const visitModels = require('./modelVisitor').visitModels;
const AjvValidator = require('./AjvValidator');
const QueryBuilder = require('../queryBuilder/QueryBuilder');
const inheritModel = require('./inheritModel');
const NotFoundError = require('./NotFoundError');
const ValidationError = require('./ValidationError');

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

const staticHiddenProps = [
  '$$knex',
  '$$validator',
  '$$jsonSchema',
  '$$colToProp',
  '$$propToCol',
  '$$idColumnArray',
  '$$fullIdColumn',
  '$$idPropertyArray',
  '$$idProperty',
  '$$relations',
  '$$relationArray'
];

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

  get isObjectionModel() {
    return true;
  }

  get objectionModelClass() {
    return Model;
  }

  $id() {
    if (arguments.length > 0) {
      return setId(this, arguments[0]);
    } else {
      return getId(this);
    }
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
    const ModelClass = this.constructor;
    return ModelClass.loadRelated(this, relationExpression, filters);
  }

  $beforeValidate(jsonSchema, json, options) {
    /* istanbul ignore next */
    return jsonSchema;
  }

  $validate(json, options) {
    json = json || this;
    options = options || {};

    if (json instanceof Model) {
      // Strip away relations and other internal stuff.
      json = clone(json, true, true);
      // We can mutate `json` now that we took a copy of it.
      options.mutable = true;
    }

    if (options.skipValidation) {
      return json;
    }

    const ModelClass = this.constructor;
    const validator = ModelClass.getValidator();
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

  $afterValidate(json, options) {
    // Do nothing by default.
  }

  $parseDatabaseJson(json) {
    const ModelClass = this.constructor;
    const jsonAttr = ModelClass.getJsonAttributes();

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

  $formatDatabaseJson(json) {
    const ModelClass = this.constructor;
    const jsonAttr = ModelClass.getJsonAttributes();

    if (jsonAttr.length) {
      // All database clients want JSON columns as strings. Do the conversion here.
      for (let i = 0, l = jsonAttr.length; i < l; ++i) {
        const attr = jsonAttr[i];
        const value = json[attr];

        if (value && typeof value === 'object') {
          json[attr] = JSON.stringify(value);
        }
      }
    }

    return json;
  }

  $parseJson(json, options) {
    return json;
  }

  $formatJson(json) {
    return json;
  }

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

    if (!options.skipParseRelations) {
      parseRelationsIntoModelInstances(this, json, options);
    }
  }

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

  $toJson(shallow) {
    const ModelClass = this.constructor;

    if (shallow) {
      return toJson(this, false, ModelClass.getRelations(), null);
    } else {
      return toJson(this, false, null, null);
    }
  }

  toJSON() {
    return this.$toJson(false);
  }

  $toDatabaseJson() {
    const ModelClass = this.constructor;
    const jsonSchema = ModelClass.getJsonSchema();

    if (jsonSchema && ModelClass.pickJsonSchemaProperties) {
      return toJson(this, true, null, jsonSchema.properties);
    } else {
      return toJson(this, true, ModelClass.getRelations(), null);
    }
  }

  $beforeInsert(queryContext) {}
  $afterInsert(queryContext) {}
  $beforeUpdate(opt, queryContext) {}
  $afterUpdate(opt, queryContext) {}
  $afterGet(queryContext) {}
  $beforeDelete(queryContext) {}
  $afterDelete(queryContext) {}

  $traverse(filterConstructor, callback) {
    if (callback === undefined) {
      callback = filterConstructor;
      filterConstructor = null;
    }

    this.constructor.traverse(filterConstructor, this, callback);
    return this;
  }

  $omit() {
    if (arguments.length === 1 && arguments[0] && typeof arguments[0] === 'object') {
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

  $pick() {
    if (arguments.length === 1 && arguments[0] && typeof arguments[0] === 'object') {
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

  $values() {
    if (arguments.length === 0) {
      return Object.keys(this).map(key => this[key]);
    } else {
      if (arguments.length === 1 && Array.isArray(arguments[0])) {
        return values(this, arguments[0]);
      } else {
        const args = new Array(arguments.length);

        for (let i = 0, l = args.length; i < l; ++i) {
          args[i] = arguments[i];
        }

        return values(this, args);
      }
    }
  }

  $propKey(props) {
    switch (props.length) {
      case 1: return this[props[0]] + '';
      case 2: return this[props[0]] + ',' + this[props[1]];
      case 3: return this[props[0]] + ',' + this[props[1]] + ',' + this[props[2]];
      default: {
        // Needs to be `var` instead of `let` to prevent a weird optimization bailout.
        var key = '';

        for (let i = 0, l = props.length; i < l; ++i) {
          key += this[props[i]];

          if (i < props.length - 1) {
            key += ',';
          }
        }

        return key;
      }
    }
  }

  $clone(shallow) {
    return clone(this, shallow, false);
  }

  $omitFromJson(keys) {
    if (arguments.length === 0) {
      return this.$$omitFromJson;
    } else {
      if (!this.hasOwnProperty('$$omitFromJson')) {
        defineNonEnumerableProperty(this, '$$omitFromJson', keys);
      } else {
        this.$$omitFromJson = this.$$omitFromJson.concat(keys);
      }
    }
  }

  $omitFromDatabaseJson(keys) {
    if (arguments.length === 0) {
      return this.$$omitFromDatabaseJson;
    } else {
      if (!this.hasOwnProperty('$$omitFromDatabaseJson')) {
        defineNonEnumerableProperty(this, '$$omitFromDatabaseJson', keys);
      } else {
        this.$$omitFromDatabaseJson = this.$$omitFromDatabaseJson.concat(keys);
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
    const ModelClass = this;
    // These are defined here to prevent a ridiculous optimization bailout
    // because of "Unsupported phi use of const or let variable".
    let BoundModelClass, relations, boundRelations, boundRelationArray;

    if (!knex.$$objection) {
      defineNonEnumerableProperty(knex, '$$objection', {
        boundModels: Object.create(null)
      });
    }

    // Check if this model class has already been bound to the given knex.
    if (knex.$$objection.boundModels[ModelClass.uniqueTag()]) {
      return knex.$$objection.boundModels[ModelClass.uniqueTag()];
    }

    // Create a new subclass of this class.
    BoundModelClass = inheritModel(ModelClass);

    for (let i = 0, l = staticHiddenProps.length; i < l; ++i) {
      const prop = staticHiddenProps[i];

      if (ModelClass.hasOwnProperty(prop)) {
        defineNonEnumerableProperty(BoundModelClass, prop, ModelClass[prop]);
      }
    }

    BoundModelClass.knex(knex);
    knex.$$objection.boundModels[ModelClass.uniqueTag()] = BoundModelClass;

    relations = ModelClass.getRelationArray();
    boundRelations = Object.create(null);
    boundRelationArray = [];

    for (let i = 0, l = relations.length; i < l; ++i) {
      const relation = relations[i];
      const boundRelation = relation.bindKnex(knex);

      boundRelations[relation.name] = boundRelation;
      boundRelationArray.push(boundRelation);
    }

    defineNonEnumerableProperty(BoundModelClass, '$$relations', boundRelations);
    defineNonEnumerableProperty(BoundModelClass, '$$relationArray', boundRelationArray);

    return BoundModelClass;
  }

  static bindTransaction(trx) {
    return this.bindKnex(trx);
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

  static getJsonAttributes() {
    // If the jsonAttributes property is not set, try to create it based
    // on the jsonSchema. All properties that are objects or arrays must
    // be converted to JSON.
    if (!this.jsonAttributes && this.getJsonSchema()) {
      this.jsonAttributes = [];

      const props = this.getJsonSchema().properties || {};
      const propNames = Object.keys(props);

      for (let i = 0, l = propNames.length; i < l; ++i) {
        const propName = propNames[i];
        const prop = props[propName];
        let types = ensureArray(prop.type).filter(it => !!it);

        if (types.length === 0 && Array.isArray(prop.anyOf)) {
          types = flattenDeep(prop.anyOf.map(it => it.type));
        }

        if (types.length === 0 && Array.isArray(prop.oneOf)) {
          types = flattenDeep(prop.oneOf.map(it => it.type));
        }

        if (types.indexOf('object') !== -1 || types.indexOf('array') !== -1) {
          this.jsonAttributes.push(propName);
        }
      }
    }

    if (!Array.isArray(this.jsonAttributes)) {
      this.jsonAttributes = [];
    }

    return this.jsonAttributes;
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

function getRelationArray(ModelClass) {
  const relations = ModelClass.getRelations();
  return Object.keys(relations).map(key => relations[key]);
}

function parseRelationsIntoModelInstances(model, json, options) {
  const ModelClass = model.constructor;
  const relations = ModelClass.getRelationArray();

  for (let i = 0, l = relations.length; i < l; ++i) {
    const relation = relations[i];
    const relationName = relation.name;
    const relationJson = json[relationName];

    if (relationJson !== undefined) {
      if (Array.isArray(relationJson)) {
        model[relationName] = relation.relatedModelClass.ensureModelArray(relationJson, options);
      } else if (relationJson) {
        model[relationName] = relation.relatedModelClass.ensureModel(relationJson, options);
      } else {
        model[relationName] = null;
      }
    }
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

function toJson(model, createDbJson, omit, pick) {
  const json = toJsonImpl(model, createDbJson, omit, pick);

  if (createDbJson) {
    return model.$formatDatabaseJson(json);
  } else {
    return model.$formatJson(json);
  }
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
    return cloneDeep(value);
  }
}

function toJsonArray(value, createDbJson) {
  const ret = new Array(value.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    ret[i] = toJsonObject(value[i], createDbJson)
  }

  return ret;
}

function clone(model, shallow, stripInternal) {
  let clone = null;

  const omitFromJson = model.$omitFromJson();
  const omitFromDatabaseJson = model.$omitFromDatabaseJson();

  if (!shallow && !stripInternal) {
    clone = cloneSimple(model);
  } else {
    clone = cloneWithOpt(model, shallow, stripInternal);
  }

  if (omitFromJson) {
    clone.$omitFromJson(omitFromJson);
  }

  if (omitFromDatabaseJson) {
    clone.$omitFromDatabaseJson(omitFromDatabaseJson);
  }

  return clone;
}

function cloneSimple(model) {
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

function cloneWithOpt(model, shallow, stripInternal) {
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
    return clone(value, false, false);
  } else if (Buffer.isBuffer(value)) {
    return new Buffer(value);
  } else {
    return cloneDeep(value);
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

    if (value && key.charAt(0) !== '$' && model.hasOwnProperty(key)) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function omitArray(model, keys) {
  const ModelClass = model.constructor;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && model.hasOwnProperty(key)) {
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

function values(model, args) {
  switch (args.length) {
    case 1: return [model[args[0]]];
    case 2: return [model[args[0]], model[args[1]]];
    case 3: return [model[args[0]], model[args[1]], model[args[2]]];
    default: {
      const ret = new Array(args.length);

      for (let i = 0, l = args.length; i < l; ++i) {
        ret[i] = model[args[i]];
      }

      return ret;
    }
  }
}

function columnNameToPropertyName(ModelClass, columnName) {
  const model = new ModelClass();
  const addedProps = Object.keys(model.$parseDatabaseJson({}));

  const row = {};
  row[columnName] = null;

  const props = Object.keys(model.$parseDatabaseJson(row));
  const propertyName = difference(props, addedProps)[0];

  return propertyName || null;
}

function propertyNameToColumnName(ModelClass, propertyName) {
  const model = new ModelClass();
  const addedCols = Object.keys(model.$formatDatabaseJson({}));

  const obj = {};
  obj[propertyName] = null;

  const cols = Object.keys(model.$formatDatabaseJson(obj));
  const columnName = difference(cols, addedCols)[0];

  return columnName || null;
}

function idColumnToIdProperty(ModelClass, idColumn) {
  const idProperty = ModelClass.columnNameToPropertyName(idColumn);

  if (!idProperty) {
    throw new Error(ModelClass.name + '.$parseDatabaseJson probably changes the value of the id column `' + idColumn + '` which is a no-no.');
  }

  return idProperty;
}

function defineNonEnumerableProperty(obj, prop, value) {
  Object.defineProperty(obj, prop, {
    enumerable: false,
    writable: true,
    configurable: true,
    value
  });
}

module.exports = Model;