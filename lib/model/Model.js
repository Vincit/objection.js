'use strict';

const { clone } = require('./modelClone');
const { bindKnex } = require('./modelBindKnex');
const { validate } = require('./modelValidate');
const { isMsSql } = require('../utils/knexUtils');
const { omit, pick } = require('./modelFilter');
const { visitModels } = require('./modelVisitor');
const { hasId, getSetId } = require('./modelId');
const { map: promiseMap } = require('../utils/promiseUtils');
const { toJson, toDatabaseJson } = require('./modelToJson');
const { values, propKey, hasProps } = require('./modelValues');
const { defineNonEnumerableProperty } = require('./modelUtils');
const { parseRelationsIntoModelInstances } = require('./modelParseRelations');
const { fetchTableMetadata, tableMetadata } = require('./modelTableMetadata');
const { asArray, isFunction, isString, asSingle } = require('../utils/objectUtils');
const { setJson, setFast, setRelated, appendRelated, setDatabaseJson } = require('./modelSet');
const {
  getJsonAttributes,
  parseJsonAttributes,
  formatJsonAttributes
} = require('./modelJsonAttributes');
const { columnNameToPropertyName, propertyNameToColumnName } = require('./modelColPropMap');

const { raw } = require('../queryBuilder/RawBuilder');
const { ref } = require('../queryBuilder/ReferenceBuilder');

const { AjvValidator } = require('./AjvValidator');
const { QueryBuilder } = require('../queryBuilder/QueryBuilder');
const { NotFoundError } = require('./NotFoundError');
const { ValidationError } = require('./ValidationError');
const { ModifierNotFoundError } = require('./ModifierNotFoundError');
const { RelationProperty } = require('../relations/RelationProperty');

const { HasOneRelation } = require('../relations/hasOne/HasOneRelation');
const { HasManyRelation } = require('../relations/hasMany/HasManyRelation');
const { ManyToManyRelation } = require('../relations/manyToMany/ManyToManyRelation');
const { BelongsToOneRelation } = require('../relations/belongsToOne/BelongsToOneRelation');
const { HasOneThroughRelation } = require('../relations/hasOneThrough/HasOneThroughRelation');

const { InstanceFindOperation } = require('../queryBuilder/operations/InstanceFindOperation');
const { InstanceInsertOperation } = require('../queryBuilder/operations/InstanceInsertOperation');
const { InstanceUpdateOperation } = require('../queryBuilder/operations/InstanceUpdateOperation');
const { InstanceDeleteOperation } = require('../queryBuilder/operations/InstanceDeleteOperation');

class Model {
  $id(maybeId) {
    return getSetId(this, maybeId);
  }

  $hasId() {
    return hasId(this);
  }

  $hasProps(props) {
    return hasProps(this, props);
  }

  $query(trx) {
    const modelClass = this.constructor;

    return modelClass
      .query(trx)
      .findOperationFactory(() => {
        return new InstanceFindOperation('find', { instance: this });
      })
      .insertOperationFactory(() => {
        return new InstanceInsertOperation('insert', { instance: this });
      })
      .updateOperationFactory(() => {
        return new InstanceUpdateOperation('update', { instance: this });
      })
      .patchOperationFactory(() => {
        return new InstanceUpdateOperation('patch', {
          instance: this,
          modelOptions: { patch: true }
        });
      })
      .deleteOperationFactory(() => {
        return new InstanceDeleteOperation('delete', { instance: this });
      })
      .relateOperationFactory(() => {
        throw new Error('`relate` makes no sense in this context');
      })
      .unrelateOperationFactory(() => {
        throw new Error('`unrelate` makes no sense in this context');
      });
  }

  $relatedQuery(relationName, trx) {
    const modelClass = this.constructor;
    const relation = modelClass.getRelation(relationName);
    const RelatedModelClass = relation.relatedModelClass;

    return RelatedModelClass.query(trx)
      .findOperationFactory(builder => {
        const operation = relation.find(builder, [this]);
        operation.assignResultToOwner = this.constructor.relatedFindQueryMutates;
        return operation;
      })
      .insertOperationFactory(builder => {
        const operation = relation.insert(builder, this);
        operation.assignResultToOwner = this.constructor.relatedInsertQueryMutates;
        return operation;
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

  $loadRelated(relationExpression, modifiers, trx) {
    return this.constructor.loadRelated(this, relationExpression, modifiers, trx);
  }

  $beforeValidate(jsonSchema, json, options) {
    /* istanbul ignore next */
    return jsonSchema;
  }

  $validate(json, options) {
    return validate(this, json, options);
  }

  $afterValidate(json, options) {
    // Do nothing by default.
  }

  $parseDatabaseJson(json) {
    const columnNameMappers = this.constructor.getColumnNameMappers();

    if (columnNameMappers) {
      json = columnNameMappers.parse(json);
    }

    return parseJsonAttributes(json, this.constructor);
  }

  $formatDatabaseJson(json) {
    const columnNameMappers = this.constructor.getColumnNameMappers();

    json = formatJsonAttributes(json, this.constructor);

    if (columnNameMappers) {
      json = columnNameMappers.format(json);
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
    return setJson(this, json, options);
  }

  $setDatabaseJson(json) {
    return setDatabaseJson(this, json);
  }

  $set(obj) {
    return setFast(this, obj);
  }

  $setRelated(relation, models) {
    return setRelated(this, relation, models);
  }

  $appendRelated(relation, models) {
    return appendRelated(this, relation, models);
  }

  $toJson(opt) {
    return toJson(this, opt);
  }

  toJSON(opt) {
    return this.$toJson(opt);
  }

  $toDatabaseJson(builder) {
    return toDatabaseJson(this, builder);
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

  // TODO: Deprecate & remove in 3.0
  $afterGet(queryContext) {
    // Do nothing by default.
  }

  $afterFind(queryContext) {
    // Do nothing by default.
  }

  $beforeDelete(queryContext) {
    // Do nothing by default.
  }

  $afterDelete(queryContext) {
    // Do nothing by default.
  }

  $omit(...args) {
    return omit(this, args);
  }

  $pick(...args) {
    return pick(this, args);
  }

  $values(props) {
    return values(this, props);
  }

  $propKey(props) {
    return propKey(this, props);
  }

  $idKey() {
    return this.$propKey(this.constructor.getIdPropertyArray());
  }

  $clone(opt) {
    return clone(this, !!(opt && opt.shallow), false);
  }

  $traverse(filterConstructor, callback) {
    if (callback === undefined) {
      callback = filterConstructor;
      filterConstructor = null;
    }

    this.constructor.traverse(filterConstructor, this, callback);
    return this;
  }

  $traverseAsync(filterConstructor, callback) {
    if (callback === undefined) {
      callback = filterConstructor;
      filterConstructor = null;
    }

    return this.constructor.traverseAsync(filterConstructor, this, callback);
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

  get $ref() {
    return this.constructor.ref;
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

  static onCreateQuery(builder) {
    // Do nothing by default.
  }

  static beforeFind(args) {
    // Do nothing by default.
  }

  static afterFind(args) {
    // Do nothing by default.
  }

  static beforeInsert(args) {
    // Do nothing by default.
  }

  static afterInsert(args) {
    // Do nothing by default.
  }

  static beforeUpdate(args) {
    // Do nothing by default.
  }

  static afterUpdate(args) {
    // Do nothing by default.
  }

  static beforeDelete(args) {
    // Do nothing by default.
  }

  static afterDelete(args) {
    // Do nothing by default.
  }

  static omitImpl(obj, prop) {
    delete obj[prop];
  }

  static joinTableAlias(relationPath) {
    return `${relationPath}_join`;
  }

  static createValidator() {
    return new AjvValidator({
      onCreateAjv: ajv => {
        /* Do Nothing by default */
      },
      options: {
        allErrors: true,
        validateSchema: false,
        ownProperties: true,
        v5: true
      }
    });
  }

  static modifierNotFound(builder, modifier) {
    throw new this.ModifierNotFoundError(modifier);
  }

  static createNotFoundError(ctx, props) {
    return new this.NotFoundError(props);
  }

  static createValidationError(props) {
    return new this.ValidationError(props);
  }

  static getTableName() {
    let tableName = this.tableName;

    if (isFunction(tableName)) {
      tableName = this.tableName();
    }

    if (!isString(tableName)) {
      throw new Error(`Model ${this.name} must have a static property tableName`);
    }

    return tableName;
  }

  static getIdColumn() {
    let idColumn = this.idColumn;

    if (isFunction(idColumn)) {
      idColumn = this.idColumn();
    }

    return idColumn;
  }

  static getValidator() {
    return cachedGet(this, '$$validator', getValidator);
  }

  static getJsonSchema() {
    return cachedGet(this, '$$jsonSchema', getJsonSchema);
  }

  static getJsonAttributes() {
    return cachedGet(this, '$$jsonAttributes', getJsonAttributes);
  }

  static getColumnNameMappers() {
    return cachedGet(this, '$$columnNameMappers', getColumnNameMappers);
  }

  static getConcurrency(knex) {
    const DEFAULT_CONCURRENCY = 4;

    if (this.concurrency === null) {
      if (!knex) {
        return DEFAULT_CONCURRENCY;
      }

      // The mssql driver is shit, and we cannot have concurrent queries.
      if (isMsSql(knex)) {
        return 1;
      } else {
        return DEFAULT_CONCURRENCY;
      }
    } else {
      if (isFunction(this.concurrency)) {
        return this.concurrency();
      } else {
        return this.concurrency;
      }
    }
  }

  static getModifiers() {
    return this.modifiers || this.namedFilters || {};
  }

  static columnNameToPropertyName(columnName) {
    let colToProp = cachedGet(this, '$$colToProp', () => new Map());
    let propertyName = colToProp.get(columnName);

    if (!propertyName) {
      propertyName = columnNameToPropertyName(this, columnName);
      colToProp.set(columnName, propertyName);
    }

    return propertyName;
  }

  static propertyNameToColumnName(propertyName) {
    let propToCol = cachedGet(this, '$$propToCol', () => new Map());
    let columnName = propToCol.get(propertyName);

    if (!columnName) {
      columnName = propertyNameToColumnName(this, propertyName);
      propToCol.set(propertyName, columnName);
    }

    return columnName;
  }

  static getReadOnlyAttributes() {
    return cachedGet(this, '$$readOnlyAttributes', getReadOnlyAttributes);
  }

  static getIdRelationProperty() {
    return cachedGet(this, '$$idRelationProperty', getIdRelationProperty);
  }

  static getIdColumnArray() {
    return this.getIdRelationProperty().cols;
  }

  static getIdPropertyArray() {
    return this.getIdRelationProperty().props;
  }

  static getIdProperty() {
    const idProps = this.getIdPropertyArray();

    if (idProps.length === 1) {
      return idProps[0];
    } else {
      return idProps;
    }
  }

  static getRelationMappings() {
    return cachedGet(this, '$$relationMappings', getRelationMappings);
  }

  static getRelations() {
    const relations = Object.create(null);

    for (const relationName of this.getRelationNames()) {
      relations[relationName] = this.getRelation(relationName);
    }

    return relations;
  }

  static getRelationNames() {
    return cachedGet(this, '$$relationNames', getRelationNames);
  }

  static getVirtualAttributes() {
    return cachedGet(this, '$$virtualAttributes', getVirtualAttributes);
  }

  static query(trx) {
    const query = this.QueryBuilder.forClass(this).transacting(trx);
    this.onCreateQuery(query);
    return query;
  }

  static relatedQuery(relationName) {
    const relation = this.getRelation(relationName);
    const modelClass = relation.relatedModelClass;

    return modelClass
      .query()
      .alias(relation.name)
      .findOperationFactory(builder => relation.subQuery(builder));
  }

  static fetchTableMetadata(opt) {
    return fetchTableMetadata(this, opt);
  }

  static tableMetadata(opt) {
    return tableMetadata(this, opt);
  }

  static knex(...args) {
    if (args.length) {
      defineNonEnumerableProperty(this, '$$knex', args[0]);
    } else {
      return this.$$knex;
    }
  }

  static transaction() {
    return this.knex();
  }

  static raw(...args) {
    return raw(...args).toKnexRaw(this.query());
  }

  static get ref() {
    return (...args) => {
      return ref(...args).model(this);
    };
  }

  /**
   * NB. for v2.0, this can simply return `this.knex().fn`.
   * However, in order to maintain backwards comparability of a bug that didn't
   * have this method as a getter, the returned value needs to be callable and
   * return the "same" `knex#FunctionHelper` instance.
   * The effect is that `Model.fn.now()` and `Model.fn().now()` produce the same result.
   */
  static get fn() {
    const fnHelper = this.knex().fn;
    const wrapper = () => fnHelper;
    Object.assign(wrapper, fnHelper);
    Object.setPrototypeOf(wrapper, Object.getPrototypeOf(fnHelper));
    return wrapper;
  }

  static knexQuery() {
    return this.knex().table(this.getTableName());
  }

  static uniqueTag() {
    if (this.name) {
      return `${this.getTableName()}_${this.name}`;
    } else {
      return this.getTableName();
    }
  }

  static bindKnex(knex) {
    return bindKnex(this, knex);
  }

  static bindTransaction(trx) {
    return bindKnex(this, trx);
  }

  static ensureModel(model, options) {
    const modelClass = this;

    if (!model) {
      return null;
    }

    if (model instanceof modelClass) {
      return parseRelationsIntoModelInstances(model, model, options);
    } else {
      return modelClass.fromJson(model, options);
    }
  }

  static ensureModelArray(input, options) {
    if (!input) {
      return [];
    }

    if (Array.isArray(input)) {
      const models = new Array(input.length);

      for (let i = 0, l = input.length; i < l; ++i) {
        models[i] = this.ensureModel(input[i], options);
      }

      return models;
    } else {
      return [this.ensureModel(input, options)];
    }
  }

  static getRelationUnsafe(name) {
    const mapping = this.getRelationMappings()[name];

    if (!mapping) {
      return null;
    }

    if (!this.hasOwnProperty('$$relations')) {
      defineNonEnumerableProperty(this, '$$relations', Object.create(null));
    }

    if (!this.$$relations[name]) {
      this.$$relations[name] = new mapping.relation(name, this);
      this.$$relations[name].setMapping(mapping);
    }

    return this.$$relations[name];
  }

  static getRelation(name) {
    const relation = this.getRelationUnsafe(name);

    if (!relation) {
      throw new Error(`A model class ${this.name} doesn't have relation ${name}`);
    }

    return relation;
  }

  static loadRelated($models, expression, modifiers, trx) {
    return this.query(trx)
      .resolve(this.ensureModelArray($models))
      .findOptions({ dontCallFindHooks: true })
      .eager(expression, modifiers)
      .runAfter(models => (Array.isArray($models) ? models : models[0]));
  }

  static traverse(...args) {
    const { traverser, models, filterConstructor } = getTraverseArgs(...args);

    if (!asSingle(models)) {
      return;
    }

    const modelClass = asSingle(models).constructor;

    visitModels(models, modelClass, (model, _, parent, relation) => {
      if (!filterConstructor || model instanceof filterConstructor) {
        traverser(model, parent, relation && relation.name);
      }
    });

    return this;
  }

  static traverseAsync(...args) {
    const { traverser, models, filterConstructor } = getTraverseArgs(...args);

    if (!asSingle(models)) {
      return Promise.resolve();
    }

    const modelClass = asSingle(models).constructor;
    const promises = [];

    visitModels(models, modelClass, (model, _, parent, relation) => {
      if (!filterConstructor || model instanceof filterConstructor) {
        const maybePromise = traverser(model, parent, relation && relation.name);
        promises.push(maybePromise);
      }
    });

    return promiseMap(promises, it => it, { concurrency: this.getConcurrency(this.knex()) });
  }
}

Object.defineProperties(Model, {
  isObjectionModelClass: {
    enumerable: false,
    writable: false,
    value: true
  }
});

Object.defineProperties(Model.prototype, {
  $isObjectionModel: {
    enumerable: false,
    writable: false,
    value: true
  },

  $objectionModelClass: {
    enumerable: false,
    writable: false,
    value: Model
  }
});

Model.QueryBuilder = QueryBuilder;

Model.HasOneRelation = HasOneRelation;
Model.HasManyRelation = HasManyRelation;
Model.ManyToManyRelation = ManyToManyRelation;
Model.BelongsToOneRelation = BelongsToOneRelation;
Model.HasOneThroughRelation = HasOneThroughRelation;

Model.JoinEagerAlgorithm = 'JoinEagerAlgorithm';
Model.NaiveEagerAlgorithm = 'NaiveEagerAlgorithm';
Model.WhereInEagerAlgorithm = 'WhereInEagerAlgorithm';

Model.ValidationError = ValidationError;
Model.NotFoundError = NotFoundError;
Model.ModifierNotFoundError = ModifierNotFoundError;

Model.tableName = null;
Model.jsonSchema = null;
Model.idColumn = 'id';
Model.uidProp = '#id';
Model.uidRefProp = '#ref';
Model.dbRefProp = '#dbRef';
Model.propRefRegex = /#ref{([^\.]+)\.([^}]+)}/g;
Model.jsonAttributes = null;
Model.cloneObjectAttributes = true;
Model.virtualAttributes = null;
Model.relationMappings = null;
Model.modelPaths = [];
Model.pickJsonSchemaProperties = false;
Model.defaultEagerAlgorithm = Model.WhereInEagerAlgorithm;
Model.defaultEagerOptions = Object.freeze({ minimize: false, separator: ':', aliases: {} });
Model.defaultFindOptions = Object.freeze({});
Model.modifiers = null;
Model.namedFilters = null;
Model.useLimitInFirst = false;
Model.columnNameMappers = null;
Model.relatedFindQueryMutates = true;
Model.relatedInsertQueryMutates = true;
Model.concurrency = null;

function cachedGet(target, hiddenPropertyName, creator) {
  if (!target.hasOwnProperty(hiddenPropertyName)) {
    defineNonEnumerableProperty(target, hiddenPropertyName, creator(target));
  }

  return target[hiddenPropertyName];
}

function getValidator(modelClass) {
  return modelClass.createValidator();
}

function getJsonSchema(modelClass) {
  return modelClass.jsonSchema;
}

function getColumnNameMappers(modelClass) {
  return modelClass.columnNameMappers;
}

function getIdRelationProperty(modelClass) {
  const idColumn = asArray(modelClass.getIdColumn());

  return new RelationProperty(
    idColumn.map(idCol => `${modelClass.getTableName()}.${idCol}`),
    () => modelClass
  );
}

function getReadOnlyAttributes(modelClass) {
  const propertyNames = Object.getOwnPropertyNames(modelClass.prototype);

  return propertyNames.filter(propName => {
    const desc = Object.getOwnPropertyDescriptor(modelClass.prototype, propName);
    return (desc.get && !desc.set) || desc.writable === false || isFunction(desc.value);
  });
}

function getRelationMappings(modelClass) {
  let relationMappings = modelClass.relationMappings;

  if (isFunction(relationMappings)) {
    relationMappings = relationMappings.call(modelClass);
  }

  return relationMappings || {};
}

function getRelationNames(modelClass) {
  return Object.keys(modelClass.getRelationMappings());
}

function getVirtualAttributes(modelClass) {
  return modelClass.virtualAttributes || [];
}

function getTraverseArgs(filterConstructor, models, traverser) {
  filterConstructor = filterConstructor || null;

  if (traverser === undefined) {
    traverser = models;
    models = filterConstructor;
    filterConstructor = null;
  }

  if (!isFunction(traverser)) {
    throw new Error('traverser must be a function');
  }

  return {
    traverser,
    models,
    filterConstructor
  };
}

module.exports = {
  Model
};
