'use strict';

const Promise = require('bluebird');
const ValidationError = require('../model/ValidationError');
const queryBuilderOperation = require('./decorators/queryBuilderOperation');
const QueryBuilderContext = require('./QueryBuilderContext');
const RelationExpression = require('./RelationExpression');
const QueryBuilderBase = require('./QueryBuilderBase');
const decorate = require('../utils/decorators/decorate');

const FindOperation = require('./operations/FindOperation');
const DeleteOperation = require('./operations/DeleteOperation');
const UpdateOperation = require('./operations/UpdateOperation');
const InsertOperation = require('./operations/InsertOperation');

const InsertGraphAndFetchOperation = require('./operations/InsertGraphAndFetchOperation');
const InsertAndFetchOperation = require('./operations/InsertAndFetchOperation');
const UpdateAndFetchOperation = require('./operations/UpdateAndFetchOperation');
const QueryBuilderOperation = require('./operations/QueryBuilderOperation');
const JoinRelationOperation = require('./operations/JoinRelationOperation');
const InsertGraphOperation = require('./operations/InsertGraphOperation');
const RunBeforeOperation = require('./operations/RunBeforeOperation');
const RunAfterOperation = require('./operations/RunAfterOperation');
const OnBuildOperation = require('./operations/OnBuildOperation');
const SelectOperation = require('./operations/SelectOperation');
const EagerOperation = require('./operations/eager/EagerOperation');
const RangeOperation = require('./operations/RangeOperation');

class QueryBuilder extends QueryBuilderBase {

  constructor(modelClass) {
    super(modelClass.knex(), QueryBuilderContext);

    this._modelClass = modelClass;
    this._explicitRejectValue = null;
    this._explicitResolveValue = null;

    this._eagerExpression = null;
    this._eagerFilterExpressions = [];
    this._allowedEagerExpression = null;
    this._allowedInsertExpression = null;

    this._findOperationOptions = {};
    this._eagerOperationOptions = {};

    this._findOperationFactory = findOperationFactory;
    this._insertOperationFactory = insertOperationFactory;
    this._updateOperationFactory = updateOperationFactory;
    this._patchOperationFactory = patchOperationFactory;
    this._relateOperationFactory = relateOperationFactory;
    this._unrelateOperationFactory = unrelateOperationFactory;
    this._deleteOperationFactory = deleteOperationFactory;
    this._eagerOperationFactory = modelClass.defaultEagerAlgorithm;
  }

  static forClass(modelClass) {
    return new this(modelClass);
  }

  get isObjectionQueryBuilder() {
    return true;
  }

  childQueryOf(query) {
    if (query) {
      this.internalContext(query.internalContext());
    }

    return this;
  }

  reject(error) {
    this._explicitRejectValue = error;
    return this;
  }

  resolve(value) {
    this._explicitResolveValue = value;
    return this;
  }

  isExecutable() {
    const hasExecutor = !!this._queryExecutorOperation();
    return !this._explicitRejectValue && !this._explicitResolveValue && !hasExecutor;
  }

  runBefore(runBefore) {}

  onBuild(onBuild) {}

  runAfter(runAfter) {}

  eagerAlgorithm(algorithm, eagerOptions) {
    this.eagerOperationFactory(algorithm);

    if (eagerOptions) {
      this.eagerOptions(eagerOptions);
    }

    return this;
  }

  eagerOperationFactory(factory) {
    this._eagerOperationFactory = factory;
    return this;
  }

  findOperationFactory(factory) {
    this._findOperationFactory = factory;
    return this;
  }

  insertOperationFactory(factory) {
    this._insertOperationFactory = factory;
    return this;
  }

  updateOperationFactory(factory) {
    this._updateOperationFactory = factory;
    return this;
  }

  patchOperationFactory(factory) {
    this._patchOperationFactory = factory;
    return this;
  }

  deleteOperationFactory(factory) {
    this._deleteOperationFactory = factory;
    return this;
  }

  relateOperationFactory(factory) {
    this._relateOperationFactory = factory;
    return this;
  }

  unrelateOperationFactory(factory) {
    this._unrelateOperationFactory = factory;
    return this;
  }

  eager(exp, filters) {
    this._eagerExpression = exp || null;

    if (typeof this._eagerExpression === 'string') {
      this._eagerExpression = RelationExpression.parse(this._eagerExpression);
    }

    if (filters) {
      this._eagerExpression.filters = filters;
    }

    checkEager(this);
    return this;
  }

  mergeEager(exp, filters) {
    if (!this._eagerExpression) {
      return this.eager(exp, filters);
    }

    const expr = RelationExpression.parse(exp);

    if (filters) {
      expr.filters = filters;
    }

    this._eagerExpression = this._eagerExpression.merge(expr);

    checkEager(this);
    return this;
  }

  allowEager(exp) {
    this._allowedEagerExpression = exp || null;

    if (typeof this._allowedEagerExpression === 'string') {
      this._allowedEagerExpression = RelationExpression.parse(this._allowedEagerExpression);
    }

    checkEager(this);
    return this;
  }

  modifyEager(path, modifier) {
    this._eagerFilterExpressions.push({
      path: path,
      filter: modifier
    });

    return this;
  }

  filterEager() {
    return this.modifyEager.apply(this, arguments);
  }

  allowInsert(exp) {
    this._allowedInsertExpression = exp || null;

    if (typeof this._allowedInsertExpression === 'string') {
      this._allowedInsertExpression = RelationExpression.parse(this._allowedInsertExpression);
    }

    return this;
  }

  eagerOptions(opt) {
    this._eagerOperationOptions = Object.assign({}, this._eagerOperationOptions, opt);
    const opIdx = this.indexOfOperation(EagerOperation);

    if (opIdx !== -1) {
      this._operations[opIdx] = this._operations[opIdx].clone({
        opt: this._eagerOperationOptions
      });
    }

    return this;
  }

  findOptions(opt) {
    this._findOperationOptions = Object.assign({}, this._findOperationOptions, opt);
    const opIdx = this.indexOfOperation(FindOperation);

    if (opIdx !== -1) {
      this._operations[opIdx] = this._operations[opIdx].clone({
        opt: this._findOperationOptions
      });
    }

    return this;
  }

  modelClass() {
    return this._modelClass;
  }

  isFindQuery() {
    return !this._operations.some(method => method.isWriteOperation) && !this._explicitRejectValue;
  }

  toString() {
    return this.build().toString();
  }

  toSql() {
    return this.toString();
  }

  clone() {
    const builder = new this.constructor(this._modelClass);
    this.baseCloneInto(builder);

    builder._explicitRejectValue = this._explicitRejectValue;
    builder._explicitResolveValue = this._explicitResolveValue;

    builder._eagerExpression = this._eagerExpression;
    builder._eagerFilterExpressions = this._eagerFilterExpressions.slice();

    builder._allowedEagerExpression = this._allowedEagerExpression;
    builder._allowedInsertExpression = this._allowedInsertExpression;

    builder._findOperationOptions = this._findOperationOptions;
    builder._eagerOperationOptions = this._eagerOperationOptions;

    builder._findOperationFactory = this._findOperationFactory;
    builder._insertOperationFactory = this._insertOperationFactory;
    builder._updateOperationFactory = this._updateOperationFactory;
    builder._patchOperationFactory = this._patchOperationFactory;
    builder._relateOperationFactory = this._relateOperationFactory;
    builder._unrelateOperationFactory = this._unrelateOperationFactory;
    builder._deleteOperationFactory = this._deleteOperationFactory;
    builder._eagerOperationFactory = this._eagerOperationFactory;

    return builder;
  }

  clearEager() {
    this._eagerExpression = null;
    this._eagerFilterExpressions = [];
    return this;
  }

  clearReject() {
    this._explicitRejectValue = null;
    return this;
  }

  clearResolve() {
    this._explicitResolveValue = null;
    return this;
  }

  then(successHandler, errorHandler) {
    var promise = this.execute();
    return promise.then.apply(promise, arguments);
  }

  map(mapper) {
    var promise = this.execute();
    return promise.map.apply(promise, arguments);
  }

  catch(errorHandler) {
    var promise = this.execute();
    return promise.catch.apply(promise, arguments);
  }

  return(returnValue) {
    var promise = this.execute();
    return promise.return.apply(promise, arguments);
  }

  bind(context) {
    var promise = this.execute();
    return promise.bind.apply(promise, arguments);
  }

  asCallback(callback) {
    var promise = this.execute();
    return promise.asCallback.apply(promise, arguments);
  }

  nodeify(callback) {
    var promise = this.execute();
    return promise.nodeify.apply(promise, arguments);
  }

  resultSize() {
    const knex = this.knex();

    // orderBy is useless here and it can make things a lot slower (at least with postgresql 9.3).
    // Remove it from the count query. We also remove the offset and limit
    const query = this.clone().clear(/orderBy|offset|limit/).build();
    const rawQuery = knex.raw(query).wrap('(', ') as temp');
    const countQuery = knex.count('* as count').from(rawQuery);

    if (this.internalOptions().debug) {
      countQuery.debug();
    }

    return countQuery.then(result => result[0] ? result[0].count : 0);
  }

  build() {
    // Take a clone so that we don't modify this instance during build.
    const builder = this.clone();

    if (builder.isFindQuery()) {
      // If no write operations have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._callFindOperation();
    }

    if (builder._eagerExpression) {
      builder._callEagerFetchOperation();
    }

    // We need to build the builder even if a query executor operation
    // has been called so that the onBuild hooks get called.
    const knexBuilder = build(builder);
    const queryExecutorOperation = builder._queryExecutorOperation();

    if (queryExecutorOperation) {
      // If the query executor is set, we build the builder that it returns.
      return queryExecutorOperation.queryExecutor(builder).build();
    } else {
      return knexBuilder;
    }
  }

  execute() {
    // Take a clone so that we don't modify this instance during execution.
    let builder = this.clone();
    let promiseCtx = {builder: builder};
    let promise = Promise.bind(promiseCtx);
    let context = builder.context() || {};
    let internalContext = builder.internalContext();

    if (builder.isFindQuery()) {
      // If no write operations have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._callFindOperation();
    }

    if (builder._eagerExpression) {
      builder._callEagerFetchOperation();
    }

    promise = chainBeforeOperations(promise, builder._operations);
    promise = chainHooks(promise, context.runBefore);
    promise = chainHooks(promise, internalContext.runBefore);
    promise = chainBeforeInternalOperations(promise, builder._operations);

    // Resolve all before hooks before building and executing the query
    // and the rest of the hooks.
    return promise.then(function () {
      const promiseCtx = this;
      const builder = promiseCtx.builder;

      let promise = null;
      let knexBuilder = build(builder);
      let queryExecutorOperation = builder._queryExecutorOperation();

      if (builder._explicitRejectValue) {
        promise  = Promise.reject(builder._explicitRejectValue).bind(promiseCtx);
      } else if (builder._explicitResolveValue) {
        promise = Promise.resolve(builder._explicitResolveValue).bind(promiseCtx);
      } else if (queryExecutorOperation) {
        promise = queryExecutorOperation.queryExecutor(builder).bind(promiseCtx);
      } else {
        promise = knexBuilder.bind(promiseCtx);
        promise = chainRawResultOperations(promise, builder._operations);
        promise = promise.then(createModels);
      }

      promise = chainAfterQueryOperations(promise, builder._operations);
      promise = chainAfterInternalOperations(promise, builder._operations);
      promise = chainHooks(promise, context.runAfter);
      promise = chainHooks(promise, internalContext.runAfter);
      promise = chainAfterOperations(promise, builder._operations);

      return promise;
    });
  }

  _queryExecutorOperation() {
    for (let i = 0, l = this._operations.length; i < l; ++i) {
      const op = this._operations[i];

      if (op.hasQueryExecutor()) {
        return op;
      }
    }

    return null;
  }

  _callFindOperation() {
    if (!this.has(FindOperation)) {
      const operation = this._findOperationFactory(this);

      operation.opt = Object.assign(operation.opt,
        this._findOperationOptions
      );

      this.callQueryBuilderOperation(operation, [], /* pushFront = */ true);
    }
  }

  _callEagerFetchOperation() {
    if (!this.has(EagerOperation) && this._eagerExpression) {
      const operation = this._eagerOperationFactory(this);

      operation.opt = Object.assign(operation.opt,
        this._modelClass.defaultEagerOptions,
        this._eagerOperationOptions
      );

      this.callQueryBuilderOperation(operation, [
        this._eagerExpression,
        this._eagerFilterExpressions
      ]);
    }
  }

  pluck(propertyName) {
    return this.runAfter(result => {
      if (Array.isArray(result)) {
        return result.map(it => it && it[propertyName]);
      } else {
        return result;
      }
    });
  }

  first() {
    return this.runAfter(result => {
      if (Array.isArray(result)) {
        return result[0];
      } else {
        return result;
      }
    });
  }

  hasSelection(selection, explicit) {
    explicit = (explicit == null) ? false : explicit;

    const table = this.modelClass().tableName;
    let noSelectStatements = true;

    for (let i = 0, l = this._operations.length; i < l; ++i) {
      const op = this._operations[i];

      if (op instanceof SelectOperation) {
        noSelectStatements = false;

        if (op.hasSelection(table, selection)) {
          return true;
        }
      }
    }

    if (noSelectStatements && !explicit) {
      // Implicit `select *`.
      return true;
    } else {
      return false;
    }
  }

  traverse(modelClass, traverser) {
    if (typeof traverser === 'undefined') {
      traverser = modelClass;
      modelClass = null;
    }

    return this.runAfter(result => {
      this._modelClass.traverse(modelClass, result, traverser);
      return result;
    });
  }

  pick(modelClass, properties) {
    if (typeof properties === 'undefined') {
      properties = modelClass;
      modelClass = null;
    }

    // Turn the properties into a hash for performance.
    properties = properties.reduce((obj, prop) => {
      obj[prop] = true;
      return obj;
    }, {});

    return this.traverse(modelClass, model => {
      model.$pick(properties);
    });
  }

  omit(modelClass, properties) {
    if (typeof properties === 'undefined') {
      properties = modelClass;
      modelClass = null;
    }

    // Turn the properties into a hash for performance.
    properties = properties.reduce((obj, prop) => {
      obj[prop] = true;
      return obj;
    }, {});

    return this.traverse(modelClass, model => {
      model.$omit(properties);
    });
  }

  page(page, pageSize) {
    return this.range(page * pageSize, (page + 1) * pageSize - 1);
  }

  range(start, end) {}

  joinRelation(relationName) {}

  innerJoinRelation(relationName) {}

  outerJoinRelation(relationName) {}

  leftJoinRelation(relationName) {}

  leftOuterJoinRelation(relationName) {}

  rightJoinRelation(relationName) {}

  rightOuterJoinRelation(relationName) {}

  fullOuterJoinRelation(relationName) {}

  findById(id) {
    return this.whereComposite(this._modelClass.getFullIdColumn(), id).first();
  }

  withSchema(schema) {
    this.internalContext().onBuild.push(builder => {
      if (!builder.has(/withSchema/)) {
        // Need to push this operation to the front because knex doesn't use the
        // schema for operations called before `withSchema`.
        builder.callKnexQueryBuilderOperation('withSchema', [schema], true);
      }
    });

    return this;
  }

  debug() {
    this.internalOptions().debug = true;
    this.internalContext().onBuild.push(builder => {
      builder.callKnexQueryBuilderOperation('debug', []);
    });

    return this;
  }

  insert(modelsOrObjects) {
    const insertOperation = this._insertOperationFactory(this);
    return this.callQueryBuilderOperation(insertOperation, [modelsOrObjects]);
  }

  insertAndFetch(modelsOrObjects) {
    const insertAndFetchOperation = new InsertAndFetchOperation('insertAndFetch', {
      delegate: this._insertOperationFactory(this)
    });

    return this.callQueryBuilderOperation(insertAndFetchOperation, [modelsOrObjects]);
  }

  insertGraph(modelsOrObjects) {
    const insertGraphOperation = new InsertGraphOperation('insertGraph', {
      delegate: this._insertOperationFactory(this)
    });

    return this.callQueryBuilderOperation(insertGraphOperation, [modelsOrObjects]);
  }

  insertWithRelated() {
    return this.insertGraph.apply(this, arguments);
  }

  insertGraphAndFetch(modelsOrObjects) {
    const insertGraphAndFetchOperation = new InsertGraphAndFetchOperation('insertGraphAndFetch', {
      delegate: new InsertGraphOperation('insertGraph', {
        delegate: this._insertOperationFactory(this)
      })
    });

    return this.callQueryBuilderOperation(insertGraphAndFetchOperation, [modelsOrObjects]);
  }

  insertWithRelatedAndFetch() {
    return this.insertGraphAndFetch.apply(this, arguments);
  }

  update(modelOrObject) {
    const updateOperation = this._updateOperationFactory(this);
    return this.callQueryBuilderOperation(updateOperation, [modelOrObject]);
  }

  updateAndFetch(modelOrObject) {
    const delegateOperation = this._updateOperationFactory(this);

    if (!(delegateOperation.instance instanceof this._modelClass)) {
      throw new Error('updateAndFetch can only be called for instance operations');
    }

    const updateAndFetch = new UpdateAndFetchOperation('updateAndFetch', {
      delegate: delegateOperation
    });

    return this.callQueryBuilderOperation(updateAndFetch, [delegateOperation.instance.$id(), modelOrObject]);
  }

  updateAndFetchById(id, modelOrObject) {
    const updateAndFetch = new UpdateAndFetchOperation('updateAndFetch', {
      delegate: this._updateOperationFactory(this)
    });

    return this.callQueryBuilderOperation(updateAndFetch, [id, modelOrObject]);
  }

  patch(modelOrObject) {
    const patchOperation = this._patchOperationFactory(this);
    return this.callQueryBuilderOperation(patchOperation, [modelOrObject]);
  }

  patchAndFetch(modelOrObject) {
    const delegateOperation = this._patchOperationFactory(this);

    if (!(delegateOperation.instance instanceof this._modelClass)) {
      throw new Error('patchAndFetch can only be called for instance operations');
    }

    const patchAndFetch = new UpdateAndFetchOperation('patchAndFetch', {
      delegate: delegateOperation
    });

    return this.callQueryBuilderOperation(patchAndFetch, [delegateOperation.instance.$id(), modelOrObject]);
  }

  patchAndFetchById(id, modelOrObject) {
    const patchAndFetch = new UpdateAndFetchOperation('patchAndFetch', {
      delegate: this._patchOperationFactory(this)
    });

    return this.callQueryBuilderOperation(patchAndFetch, [id, modelOrObject]);
  }

  delete() {
    const deleteOperation = this._deleteOperationFactory(this);
    return this.callQueryBuilderOperation(deleteOperation, []);
  }

  del() {
    return this.delete();
  }

  deleteById(id) {
    return this.delete().whereComposite(this._modelClass.getFullIdColumn(), id);
  }

  relate(ids) {
    const relateOperation = this._relateOperationFactory(this);
    return this.callQueryBuilderOperation(relateOperation, [ids]);
  }

  unrelate() {
    const unrelateOperation = this._unrelateOperationFactory(this);
    return this.callQueryBuilderOperation(unrelateOperation, []);
  }

  increment(propertyName, howMuch) {
    const columnName = this.modelClass().propertyNameToColumnName(propertyName);

    return this.patch({
      [columnName]: this.knex().raw('?? + ?', [columnName, howMuch])
    });
  }

  decrement(propertyName, howMuch) {
    const columnName = this.modelClass().propertyNameToColumnName(propertyName);

    return this.patch({
      [columnName]: this.knex().raw('?? - ?', [columnName, howMuch])
    });
  }
}

/**
 * Until node gets decorators, we need to apply them like this.
 */
decorate(QueryBuilder.prototype, [{
  decorator: writeQueryOperation,
  properties: [
    'insert',
    'insertAndFetch',
    'insertGraph',
    'insertGraphAndFetch',
    'update',
    'updateAndFetch',
    'updateAndFetchById',
    'patch',
    'patchAndFetch',
    'patchAndFetchById',
    'delete',
    'unrelate',
    'relate'
  ]
}, {
  decorator: queryBuilderOperation(RangeOperation),
  properties: ['range']
}, {
  decorator: queryBuilderOperation([JoinRelationOperation, {joinOperation: 'join'}]),
  properties: ['joinRelation']
}, {
  decorator: queryBuilderOperation([JoinRelationOperation, {joinOperation: 'innerJoin'}]),
  properties: ['innerJoinRelation']
}, {
  decorator: queryBuilderOperation([JoinRelationOperation, {joinOperation: 'outerJoin'}]),
  properties: ['outerJoinRelation']
}, {
  decorator: queryBuilderOperation([JoinRelationOperation, {joinOperation: 'leftJoin'}]),
  properties: ['leftJoinRelation']
}, {
  decorator: queryBuilderOperation([JoinRelationOperation, {joinOperation: 'leftOuterJoin'}]),
  properties: ['leftOuterJoinRelation']
}, {
  decorator: queryBuilderOperation([JoinRelationOperation, {joinOperation: 'rightJoin'}]),
  properties: ['rightJoinRelation']
}, {
  decorator: queryBuilderOperation([JoinRelationOperation, {joinOperation: 'rightOuterJoin'}]),
  properties: ['rightOuterJoinRelation']
}, {
  decorator: queryBuilderOperation([JoinRelationOperation, {joinOperation: 'fullOuterJoin'}]),
  properties: ['fullOuterJoinRelation']
}, {
  decorator: queryBuilderOperation(RunBeforeOperation),
  properties: ['runBefore']
}, {
  decorator: queryBuilderOperation(OnBuildOperation),
  properties: ['onBuild']
}, {
  decorator: queryBuilderOperation(RunAfterOperation),
  properties: ['runAfter']
}]);

function writeQueryOperation(target, property, descriptor) {
  const func = descriptor.value;

  descriptor.value = function decorator$writeQueryOperation() {
    if (!this.isFindQuery()) {
      return this.reject(new Error('Double call to a write method. ' +
        'You can only call one of the write methods ' +
        '(insert, update, patch, delete, relate, unrelate, increment, decrement) ' +
        'and only once per query builder.'));
    }

    try {
      func.apply(this, arguments);
    } catch (err) {
      this.reject(err);
    }

    return this;
  };
}

function checkEager(builder) {
  if (builder._eagerExpression && builder._allowedEagerExpression) {
    if (!builder._allowedEagerExpression.isSubExpression(builder._eagerExpression)) {
      builder.reject(new ValidationError({eager: 'eager expression not allowed'}));
    }
  }
}

function createModels(result) {
  const builder = this.builder;

  if (result === null || result === undefined) {
    return null;
  }

  if (Array.isArray(result)) {
    if (result.length && typeof result[0] === 'object' && !(result[0] instanceof builder._modelClass)) {
      for (let i = 0, l = result.length; i < l; ++i) {
        result[i] = builder._modelClass.fromDatabaseJson(result[i]);
      }
    }
  } else if (typeof result === 'object' && !(result instanceof builder._modelClass)) {
    result = builder._modelClass.fromDatabaseJson(result);
  }

  return result;
}

function build(builder) {
  let context = builder.context() || {};
  let internalContext = builder.internalContext();
  let knexBuilder = builder.knex().queryBuilder();

  callOnBuildHooks(builder, context.onBuild);
  callOnBuildHooks(builder, internalContext.onBuild);

  knexBuilder = builder.buildInto(knexBuilder);

  if (!builder.has(QueryBuilderBase.FromSelector)) {
    const table = builder.modelClass().tableName;

    // Set the table only if it hasn't been explicitly set yet.
    knexBuilder.table(table);

    if (!builder.has(QueryBuilderBase.SelectSelector)) {
      knexBuilder.select(`${table}.*`);
    }
  }

  return knexBuilder;
}

function chainHooks(promise, func) {
  if (typeof func === 'function') {
    promise = promise.then(function (result) {
      return func.call(this.builder, result, this.builder);
    });
  } else if (Array.isArray(func)) {
    func.forEach(func => {
      promise = promise.then(function (result) {
        return func.call(this.builder, result, this.builder);
      });
    });
  }

  return promise;
}

function callOnBuildHooks(builder, func) {
  if (typeof func === 'function') {
    func.call(builder, builder);
  } else if (Array.isArray(func)) {
    for (let i = 0, l = func.length; i < l; ++i) {
      func[i].call(builder, builder);
    }
  }
}

function createHookCaller(hook) {
  const hasMethod = 'has' + hook.charAt(0).toUpperCase() + hook.substr(1);

  return (promise, operations) => {
    for (let i = 0, l = operations.length; i < l; ++i) {
      const op = operations[i];

      if (op[hasMethod]()) {
        promise = promise.then(function (result) {
          return op[hook](this.builder, result);
        });
      }
    }

    return promise;
  };
}

function createOperationFactory(OperationClass, name, options) {
  return () => {
    return new OperationClass(name, options);
  };
}

const chainBeforeOperations = createHookCaller('onBefore');
const chainBeforeInternalOperations = createHookCaller('onBeforeInternal');
const chainRawResultOperations = createHookCaller('onRawResult');
const chainAfterQueryOperations = createHookCaller('onAfterQuery');
const chainAfterInternalOperations = createHookCaller('onAfterInternal');
const chainAfterOperations = createHookCaller('onAfter');

const findOperationFactory = createOperationFactory(FindOperation, 'find');
const insertOperationFactory = createOperationFactory(InsertOperation, 'insert');
const updateOperationFactory = createOperationFactory(UpdateOperation, 'update');
const patchOperationFactory = createOperationFactory(UpdateOperation, 'patch', {modelOptions: {patch: true}});
const relateOperationFactory = createOperationFactory(QueryBuilderOperation, 'relate');
const unrelateOperationFactory = createOperationFactory(QueryBuilderOperation, 'unrelate');
const deleteOperationFactory = createOperationFactory(DeleteOperation, 'delete');

module.exports = QueryBuilder;