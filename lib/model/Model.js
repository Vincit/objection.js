const { clone } = require('./modelClone');
const { asArray } = require('../utils/objectUtils');
const { bindKnex } = require('./modelBindKnex');
const { validate } = require('./modelValidate');
const { isPromise } = require('../utils/promiseUtils');
const { omit, pick } = require('./modelFilter');
const { visitModels } = require('./modelVisitor');
const { hasId, getSetId } = require('./modelId');
const { toJson, toDatabaseJson } = require('./modelToJson');
const { values, propKey, hasProps } = require('./modelValues');
const { defineNonEnumerableProperty } = require('./modelUtils');
const { parseRelationsIntoModelInstances } = require('./modelParseRelations');
const { fetchTableMetadata, tableMetadata } = require('./modelTableMetadata');
const { setJson, setFast, setRelated, appendRelated, setDatabaseJson } = require('./modelSet');
const {
  getJsonAttributes,
  parseJsonAttributes,
  formatJsonAttributes
} = require('./modelJsonAttributes');
const {
  idColumnToIdProperty,
  columnNameToPropertyName,
  propertyNameToColumnName
} = require('./modelColPropMap');

const AjvValidator = require('./AjvValidator');
const QueryBuilder = require('../queryBuilder/QueryBuilder');
const NotFoundError = require('./NotFoundError');
const ValidationError = require('./ValidationError');
const RelationProperty = require('../relations/RelationProperty');

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
    const ModelClass = this.constructor;

    return ModelClass.query(trx)
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
    const ModelClass = this.constructor;
    const relation = ModelClass.getRelation(relationName);
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

  $loadRelated(relationExpression, filters, trx) {
    return this.constructor.loadRelated(this, relationExpression, filters, trx);
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

  $toDatabaseJson(knex) {
    return toDatabaseJson(this, knex);
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
    return omit(this, arguments);
  }

  $pick() {
    return pick(this, arguments);
  }

  $values(props) {
    return values(this, props);
  }

  $propKey(props) {
    return propKey(this, props);
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

  static createNotFoundError(ctx) {
    return new this.NotFoundError();
  }

  static createValidationError(props) {
    return new this.ValidationError(props);
  }

  static getTableName() {
    let tableName = this.tableName;

    if (typeof tableName === 'function') {
      tableName = this.tableName();
    }

    if (typeof tableName !== 'string') {
      throw new Error(`Model ${this.name} must have a static property tableName`);
    }

    return tableName;
  }

  static getIdColumn() {
    let idColumn = this.idColumn;

    if (typeof idColumn === 'function') {
      idColumn = this.idColumn();
    }

    return idColumn;
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

  static getJsonAttributes() {
    // Memoize the jsonAttributes but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$jsonAttributes')) {
      defineNonEnumerableProperty(this, '$$jsonAttributes', getJsonAttributes(this));
    }

    return this.$$jsonAttributes;
  }

  static getColumnNameMappers() {
    // Memoize the columnNameMappers but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$columnNameMappers')) {
      defineNonEnumerableProperty(this, '$$columnNameMappers', this.columnNameMappers);
    }

    return this.$$columnNameMappers;
  }

  static columnNameToPropertyName(columnName) {
    // Memoize the converted names but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$colToProp')) {
      defineNonEnumerableProperty(this, '$$colToProp', new Map());
    }

    let propertyName = this.$$colToProp.get(columnName);

    if (!propertyName) {
      propertyName = columnNameToPropertyName(this, columnName);
      this.$$colToProp.set(columnName, propertyName);
    }

    return propertyName;
  }

  static propertyNameToColumnName(propertyName) {
    // Memoize the converted names but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$propToCol')) {
      defineNonEnumerableProperty(this, '$$propToCol', new Map());
    }

    let columnName = this.$$propToCol.get(propertyName);

    if (!columnName) {
      columnName = propertyNameToColumnName(this, propertyName);
      this.$$propToCol.set(propertyName, columnName);
    }

    return columnName;
  }

  static getReadOnlyVirtualAttributes() {
    // Memoize getReadOnlyVirtualAttributes but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$readOnlyVirtualAttributes')) {
      defineNonEnumerableProperty(
        this,
        '$$readOnlyVirtualAttributes',
        getReadOnlyVirtualAttributes(this)
      );
    }

    return this.$$readOnlyVirtualAttributes;
  }

  static getIdRelationProperty() {
    // Memoize getIdRelationProperty but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$idRelationProperty')) {
      defineNonEnumerableProperty(this, '$$idRelationProperty', getIdRelationProperty(this));
    }

    return this.$$idRelationProperty;
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

  static getRelations() {
    // Memoize relations but only for this class. The hasOwnProperty check
    // will fail for subclasses and the value gets recreated.
    if (!this.hasOwnProperty('$$relations')) {
      let relationMappings = this.relationMappings;

      if (typeof relationMappings === 'function') {
        relationMappings = relationMappings.call(this);
      }

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
    return this.QueryBuilder.forClass(this).transacting(trx);
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
    const ModelClass = this;

    if (!model) {
      return null;
    }

    if (model instanceof ModelClass) {
      return parseRelationsIntoModelInstances(model, model, options);
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

      for (let i = 0, l = input.length; i < l; ++i) {
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

  static loadRelated($models, expression, filters, trx) {
    return this.query(trx)
      .resolve(this.ensureModelArray($models))
      .findOptions({ dontCallAfterGet: true })
      .eager(expression, filters)
      .runAfter(models => (Array.isArray($models) ? models : models[0]));
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

    const modelClass = Array.isArray(models) ? models[0].constructor : models.constructor;

    visitModels(models, modelClass, (model, modelClass, parent, relation) => {
      if (!filterConstructor || model instanceof filterConstructor) {
        traverser(model, parent, relation && relation.name);
      }
    });

    return this;
  }
}

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
Model.defaultEagerOptions = Object.freeze({ minimize: false, separator: ':', aliases: {} });
Model.defaultFindOptions = Object.freeze({});
Model.namedFilters = null;
Model.useLimitInFirst = false;
Model.columnNameMappers = null;
Model.relatedFindQueryMutates = true;
Model.relatedInsertQueryMutates = true;
Model.concurrency = 1;

function getIdRelationProperty(ModelClass) {
  const idColumn = asArray(ModelClass.getIdColumn());

  return new RelationProperty(
    idColumn.map(idCol => `${ModelClass.getTableName()}.${idCol}`),
    () => ModelClass
  );
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
