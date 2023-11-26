'use strict';

const { clone } = require('./modelClone');
const { bindKnex } = require('./modelBindKnex');
const { validate } = require('./modelValidate');
const { isMsSql } = require('../utils/knexUtils');
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
  formatJsonAttributes,
} = require('./modelJsonAttributes');
const { columnNameToPropertyName, propertyNameToColumnName } = require('./modelColPropMap');

const { raw } = require('../queryBuilder/RawBuilder');
const { ref } = require('../queryBuilder/ReferenceBuilder');
const { fn } = require('../queryBuilder/FunctionBuilder');

const { AjvValidator } = require('./AjvValidator');
const { QueryBuilder } = require('../queryBuilder/QueryBuilder');
const { NotFoundError } = require('./NotFoundError');
const { ValidationError } = require('./ValidationError');
const { ModifierNotFoundError } = require('./ModifierNotFoundError');
const { RelationProperty } = require('../relations/RelationProperty');
const { RelationOwner } = require('../relations/RelationOwner');

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
  get $modelClass() {
    return this.constructor;
  }

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
    return instanceQuery({
      instance: this,
      transaction: trx,
    });
  }

  $relatedQuery(relationName, trx) {
    return relatedQuery({
      modelClass: this.constructor,
      relationName,
      transaction: trx,
      alwaysReturnArray: false,
    }).for(this);
  }

  $fetchGraph(relationExpression, options) {
    return this.constructor.fetchGraph(this, relationExpression, options);
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

  $afterFind(queryContext) {
    // Do nothing by default.
  }

  $beforeDelete(queryContext) {
    // Do nothing by default.
  }

  $afterDelete(queryContext) {
    // Do nothing by default.
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

  $omitFromJson(...props) {
    if (arguments.length === 0) {
      return this.$$omitFromJson;
    } else {
      if (!this.hasOwnProperty('$$omitFromJson')) {
        defineNonEnumerableProperty(this, '$$omitFromJson', []);
      }
      this.$$omitFromJson = this.$$omitFromJson.concat(asPropsArray(props));
      return this;
    }
  }

  $omitFromDatabaseJson(...props) {
    if (arguments.length === 0) {
      return this.$$omitFromDatabaseJson;
    } else {
      if (!this.hasOwnProperty('$$omitFromDatabaseJson')) {
        defineNonEnumerableProperty(this, '$$omitFromDatabaseJson', []);
      }
      this.$$omitFromDatabaseJson = this.$$omitFromDatabaseJson.concat(asPropsArray(props));
      return this;
    }
  }

  $knex() {
    return this.constructor.knex();
  }

  $transaction(...args) {
    return this.constructor.transaction(...args);
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
      onCreateAjv: (ajv) => {
        /* Do Nothing by default */
      },
      options: {
        allErrors: true,
        validateSchema: false,
        ownProperties: true,
        v5: true,
      },
    });
  }

  static modifierNotFound(builder, modifier) {
    throw new this.ModifierNotFoundError(modifier);
  }

  static createNotFoundError(queryContext, props) {
    return new this.NotFoundError({ ...props, modelClass: this });
  }

  static createValidationError(props) {
    return new this.ValidationError({ ...props, modelClass: this });
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
    return this.modifiers || {};
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

  static getDefaultGraphOptions() {
    return this.defaultGraphOptions;
  }

  static getRelatedFindQueryMutates() {
    return this.relatedFindQueryMutates;
  }

  static getRelatedInsertQueryMutates() {
    return this.relatedInsertQueryMutates;
  }

  static query(trx) {
    const query = this.QueryBuilder.forClass(this).transacting(trx);
    this.onCreateQuery(query);
    return query;
  }

  static relatedQuery(relationName, trx) {
    return relatedQuery({
      modelClass: this,
      relationName,
      transaction: trx,
      alwaysReturnArray: true,
    });
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

  static transaction(knexOrTrx, cb) {
    if (!cb) {
      cb = knexOrTrx;
      knexOrTrx = null;
    }

    return (knexOrTrx || this.knex()).transaction(cb);
  }

  static startTransaction(knexOrTrx) {
    const { transaction } = require('../transaction');
    return transaction.start(knexOrTrx || this.knex());
  }

  static get raw() {
    return raw;
  }

  static get ref() {
    return (...args) => {
      return ref(...args).model(this);
    };
  }

  static get fn() {
    return fn;
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

  static fetchGraph($models, expression, options = {}) {
    return this.query(options.transaction)
      .resolve(this.ensureModelArray($models))
      .findOptions({ dontCallFindHooks: true })
      .withGraphFetched(expression, options)
      .runAfter((models) => (Array.isArray($models) ? models : models[0]));
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

    return promiseMap(promises, (it) => it, { concurrency: this.getConcurrency(this.knex()) });
  }
}

Object.defineProperties(Model, {
  isObjectionModelClass: {
    enumerable: false,
    writable: false,
    value: true,
  },
});

Object.defineProperties(Model.prototype, {
  $isObjectionModel: {
    enumerable: false,
    writable: false,
    value: true,
  },

  $objectionModelClass: {
    enumerable: false,
    writable: false,
    value: Model,
  },
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
Model.defaultGraphOptions = null;
Model.defaultFindOptions = Object.freeze({});
Model.modifiers = null;
Model.useLimitInFirst = false;
Model.columnNameMappers = null;
Model.relatedFindQueryMutates = false;
Model.relatedInsertQueryMutates = false;
Model.concurrency = null;

function instanceQuery({ instance, transaction }) {
  const modelClass = instance.constructor;

  return modelClass
    .query(transaction)
    .findOperationFactory(() => {
      return new InstanceFindOperation('find', { instance });
    })
    .insertOperationFactory(() => {
      return new InstanceInsertOperation('insert', { instance });
    })
    .updateOperationFactory(() => {
      return new InstanceUpdateOperation('update', { instance });
    })
    .patchOperationFactory(() => {
      return new InstanceUpdateOperation('patch', {
        instance,
        modelOptions: { patch: true },
      });
    })
    .deleteOperationFactory(() => {
      return new InstanceDeleteOperation('delete', { instance });
    })
    .relateOperationFactory(() => {
      throw new Error('`relate` makes no sense in this context');
    })
    .unrelateOperationFactory(() => {
      throw new Error('`unrelate` makes no sense in this context');
    });
}

function relatedQuery({ modelClass, relationName, transaction, alwaysReturnArray } = {}) {
  const relation = modelClass.getRelation(relationName);
  const relatedModelClass = relation.relatedModelClass;

  return relatedModelClass
    .query(transaction)
    .findOperationFactory((builder) => {
      const isSubQuery = !builder.for();
      const owner = isSubQuery
        ? RelationOwner.createParentReference(builder, relation)
        : RelationOwner.create(builder.for());

      const operation = relation.find(builder, owner);

      operation.assignResultToOwner = modelClass.getRelatedFindQueryMutates();
      operation.alwaysReturnArray = alwaysReturnArray;
      operation.alias = isSubQuery ? relation.name : null;

      return operation;
    })
    .insertOperationFactory((builder) => {
      const owner = RelationOwner.create(builder.for());
      const operation = relation.insert(builder, owner);

      operation.assignResultToOwner = modelClass.getRelatedInsertQueryMutates();
      return operation;
    })
    .updateOperationFactory((builder) => {
      const owner = RelationOwner.create(builder.for());
      return relation.update(builder, owner);
    })
    .patchOperationFactory((builder) => {
      const owner = RelationOwner.create(builder.for());
      return relation.patch(builder, owner);
    })
    .deleteOperationFactory((builder) => {
      const owner = RelationOwner.create(builder.for());
      return relation.delete(builder, owner);
    })
    .relateOperationFactory((builder) => {
      const owner = RelationOwner.create(builder.for());
      return relation.relate(builder, owner);
    })
    .unrelateOperationFactory((builder) => {
      const owner = RelationOwner.create(builder.for());
      return relation.unrelate(builder, owner);
    });
}

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
    idColumn.map((idCol) => `${modelClass.getTableName()}.${idCol}`),
    () => modelClass,
  );
}

function getReadOnlyAttributes(modelClass) {
  return [...new Set(getReadOnlyAttributesRecursively(modelClass))];
}

function getReadOnlyAttributesRecursively(modelClass) {
  if (modelClass === Model || modelClass.prototype == undefined) {
    // Stop recursion to the model class or its prototype is null or undefined.
    return [];
  }

  const propertyNames = Object.getOwnPropertyNames(modelClass.prototype);

  return [
    ...getReadOnlyAttributes(Object.getPrototypeOf(modelClass)),
    ...propertyNames.filter((propName) => {
      const desc = Object.getOwnPropertyDescriptor(modelClass.prototype, propName);
      return (desc.get && !desc.set) || desc.writable === false || isFunction(desc.value);
    }),
  ];
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
    filterConstructor,
  };
}

function asPropsArray(props) {
  if (props.length === 1) {
    const arg = props[0];
    if (Array.isArray(arg)) {
      return arg;
    } else if (arg && typeof arg === 'object') {
      return Object.entries(arg)
        .filter(([, value]) => value)
        .map(([key]) => key);
    }
  }
  return props;
}

module.exports = {
  Model,
};
