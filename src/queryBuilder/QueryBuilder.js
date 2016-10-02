import _ from 'lodash';
import Promise from 'bluebird';
import queryBuilderOperation from './decorators/queryBuilderOperation';
import QueryBuilderContext from './QueryBuilderContext';
import RelationExpression from './RelationExpression';
import QueryBuilderBase from './QueryBuilderBase';
import ValidationError from '../ValidationError';

import FindOperation from './operations/FindOperation';
import DeleteOperation from './operations/DeleteOperation';
import UpdateOperation from './operations/UpdateOperation';
import InsertOperation from './operations/InsertOperation';

import InsertGraphAndFetchOperation from './operations/InsertGraphAndFetchOperation';
import InsertAndFetchOperation from './operations/InsertAndFetchOperation';
import UpdateAndFetchOperation from './operations/UpdateAndFetchOperation';
import QueryBuilderOperation from './operations/QueryBuilderOperation';
import JoinRelationOperation from './operations/JoinRelationOperation';
import InsertGraphOperation from './operations/InsertGraphOperation';
import RunBeforeOperation from './operations/RunBeforeOperation';
import RunAfterOperation from './operations/RunAfterOperation';
import OnBuildOperation from './operations/OnBuildOperation';
import SelectOperation from './operations/SelectOperation';
import EagerOperation from './operations/EagerOperation';

export default class QueryBuilder extends QueryBuilderBase {

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

  /**
   * @param {Model} modelClass
   * @returns {QueryBuilder}
   */
  static forClass(modelClass) {
    return new this(modelClass);
  }

  /**
   * @param {QueryBuilderBase} query
   * @returns {QueryBuilder}
   */
  childQueryOf(query) {
    if (query) {
      this.internalContext(query.internalContext());
    }

    return this;
  }

  /**
   * @param {Error} error
   * @returns {QueryBuilder}
   */
  reject(error) {
    this._explicitRejectValue = error;
    return this;
  }

  /**
   * @param {*} value
   * @returns {QueryBuilder}
   */
  resolve(value) {
    this._explicitResolveValue = value;
    return this;
  }

  /**
   * @returns {boolean}
   */
  isExecutable() {
    const hasExecutor = !!this._queryExecutorOperation();
    return !this._explicitRejectValue && !this._explicitResolveValue && !hasExecutor;
  }

  /**
   * @param {function(*, QueryBuilder)} runBefore
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation(RunBeforeOperation)
  runBefore(runBefore) {}

  /**
   * @param {function(QueryBuilder)} onBuild
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation(OnBuildOperation)
  onBuild(onBuild) {}

  /**
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfter
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation(RunAfterOperation)
  runAfter(runAfter) {}

  /**
   * @param {function(QueryBuilder):EagerOperation} algorithm
   * @param {object=} eagerOptions
   * @returns {QueryBuilder}
   */
  eagerAlgorithm(algorithm, eagerOptions) {
    this.eagerOperationFactory(algorithm);

    if (eagerOptions) {
      this.eagerOptions(eagerOptions);
    }

    return this;
  }

  /**
   * @param {function(QueryBuilder):EagerOperation} factory
   * @returns {QueryBuilder}
   */
  eagerOperationFactory(factory) {
    this._eagerOperationFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderOperation} factory
   * @returns {QueryBuilder}
   */
  findOperationFactory(factory) {
    this._findOperationFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderOperation} factory
   * @returns {QueryBuilder}
   */
  insertOperationFactory(factory) {
    this._insertOperationFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderOperation} factory
   * @returns {QueryBuilder}
   */
  updateOperationFactory(factory) {
    this._updateOperationFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderOperation} factory
   * @returns {QueryBuilder}
   */
  patchOperationFactory(factory) {
    this._patchOperationFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderOperation} factory
   * @returns {QueryBuilder}
   */
  deleteOperationFactory(factory) {
    this._deleteOperationFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderOperation} factory
   * @returns {QueryBuilder}
   */
  relateOperationFactory(factory) {
    this._relateOperationFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderOperation} factory
   * @returns {QueryBuilder}
   */
  unrelateOperationFactory(factory) {
    this._unrelateOperationFactory = factory;
    return this;
  }

  /**
   * @param {string|RelationExpression} exp
   * @param {Object.<string, function(QueryBuilder)>=} filters
   * @returns {QueryBuilder}
   */
  eager(exp, filters) {
    this._eagerExpression = exp || null;

    if (_.isString(this._eagerExpression)) {
      this._eagerExpression = RelationExpression.parse(this._eagerExpression);
    }

    if (_.isObject(filters)) {
      this._eagerExpression.filters = filters;
    }

    checkEager(this);
    return this;
  }

  /**
   * @param {string|RelationExpression} exp
   * @returns {QueryBuilder}
   */
  allowEager(exp) {
    this._allowedEagerExpression = exp || null;

    if (_.isString(this._allowedEagerExpression)) {
      this._allowedEagerExpression = RelationExpression.parse(this._allowedEagerExpression);
    }

    checkEager(this);
    return this;
  }

  /**
   * @param {string|RelationExpression} path
   * @param {function(QueryBuilder)} modifier
   * @returns {QueryBuilder}
   */
  modifyEager(path, modifier) {
    this._eagerFilterExpressions.push({
      path: path,
      filter: modifier
    });

    return this;
  }

  filterEager(...args) {
    return this.modifyEager(...args);
  }

  /**
   * @param {string|RelationExpression} exp
   * @returns {QueryBuilder}
   */
  allowInsert(exp) {
    this._allowedInsertExpression = exp || null;

    if (_.isString(this._allowedInsertExpression)) {
      this._allowedInsertExpression = RelationExpression.parse(this._allowedInsertExpression);
    }

    return this;
  }

  /**
   * @param {object} opt
   * @return {QueryBuilder}
   */
  eagerOptions(opt) {
    this._eagerOperationOptions = Object.assign({}, this._eagerOperationOptions, opt);
    const opIdx = this.indexOfOperation(EagerOperation);

    if (opIdx !== -1) {
      this._operations[opIdx] = this._operations[opIdx].clone({
        opt: this._findOperationOptions
      });
    }

    return this;
  }

  /**
   * @param {object} opt
   * @return {QueryBuilder}
   */
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

  /**
   * @returns {Constructor.<Model>}
   */
  modelClass() {
    return this._modelClass;
  }

  /**
   * @returns {boolean}
   */
  isFindQuery() {
    return !_.some(this._operations, method => method.isWriteOperation) && !this._explicitRejectValue;
  }

  /**
   * @returns {string}
   */
  toString() {
    return this.build().toString();
  }

  /**
   * @returns {string}
   */
  toSql() {
    return this.toString();
  }

  /**
   * @returns {QueryBuilder}
   */
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

  /**
   * @returns {QueryBuilder}
   */
  clearEager() {
    this._eagerExpression = null;
    this._eagerFilterExpressions = [];
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  clearReject() {
    this._explicitRejectValue = null;
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  clearResolve() {
    this._explicitResolveValue = null;
    return this;
  }

  /**
   * @param {function=} successHandler
   * @param {function=} errorHandler
   * @returns {Promise}
   */
  then(successHandler, errorHandler) {
    var promise = this.execute();
    return promise.then.apply(promise, arguments);
  }

  /**
   * @param {function} mapper
   * @returns {Promise}
   */
  map(mapper) {
    var promise = this.execute();
    return promise.map.apply(promise, arguments);
  }

  /**
   * @param {function} errorHandler
   * @returns {Promise}
   */
  catch(errorHandler) {
    var promise = this.execute();
    return promise.catch.apply(promise, arguments);
  }

  /**
   * @param {*} returnValue
   * @returns {Promise}
   */
  return(returnValue) {
    var promise = this.execute();
    return promise.return.apply(promise, arguments);
  }

  /**
   * @param {*} context
   * @returns {Promise}
   */
  bind(context) {
    var promise = this.execute();
    return promise.bind.apply(promise, arguments);
  }

  /**
   * @param {function} callback
   * @returns {Promise}
   */
  asCallback(callback) {
    var promise = this.execute();
    return promise.asCallback.apply(promise, arguments);
  }

  /**
   * @param {function} callback
   * @returns {Promise}
   */
  nodeify(callback) {
    var promise = this.execute();
    return promise.nodeify.apply(promise, arguments);
  }

  /**
   * @returns {Promise}
   */
  resultSize() {
    const knex = this.knex();

    // orderBy is useless here and it can make things a lot slower (at least with postgresql 9.3).
    // Remove it from the count query. We also remove the offset and limit
    let query = this.clone().clear(/orderBy|offset|limit/).build();
    let rawQuery = knex.raw(query).wrap('(', ') as temp');
    let countQuery = knex.count('* as count').from(rawQuery);

    return countQuery.then(result => result[0] ? result[0].count : 0);
  }

  /**
   * @param {number} page
   * @param {number} pageSize
   * @returns {QueryBuilder}
   */
  page(page, pageSize) {
    return this.range(page * pageSize, (page + 1) * pageSize - 1);
  }

  /**
   * @param {number} start
   * @param {number} end
   * @returns {QueryBuilder}
   */
  range(start, end) {
    let resultSizePromise;

    return this
      .limit(end - start + 1)
      .offset(start)
      .runBefore(() => {
        // Don't return the promise so that it is executed
        // in parallel with the actual query.
        resultSizePromise = this.resultSize();
      })
      .runAfter(results => {
        // Now that the actual query is finished, wait until the
        // result size has been calculated.
        return Promise.all([results, resultSizePromise]);
      })
      .runAfter(arr => {
        return {
          results: arr[0],
          total: _.parseInt(arr[1])
        };
      });
  };

  /**
   * @returns {knex.QueryBuilder}
   */
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

  /**
   * @returns {Promise}
   */
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

  /**
   * @private
   * @returns {QueryBuilderOperation}
   */
  _queryExecutorOperation() {
    for (let i = 0, l = this._operations.length; i < l; ++i) {
      const op = this._operations[i];

      if (op.hasQueryExecutor()) {
        return op;
      }
    }

    return null;
  }

  /**
   * @private
   */
  _callFindOperation() {
    if (!this.has(FindOperation)) {
      const operation = this._findOperationFactory(this);

      operation.opt = _.merge(operation.opt,
        this._findOperationOptions
      );

      this.callQueryBuilderOperation(operation, [], /* pushFront = */ true);
    }
  }

  /**
   * @private
   */
  _callEagerFetchOperation() {
    if (!this.has(EagerOperation) && this._eagerExpression) {
      const operation = this._eagerOperationFactory(this);

      operation.opt = _.merge(operation.opt,
        this._modelClass.defaultEagerOptions,
        this._eagerOperationOptions
      );

      this.callQueryBuilderOperation(operation, [
        this._eagerExpression,
        this._eagerFilterExpressions
      ]);
    }
  }

  /**
   * @param {string} propertyName
   * @returns {QueryBuilder}
   */
  pluck(propertyName) {
    return this.runAfter(result => {
      if (_.isArray(result)) {
        return _.map(result, propertyName);
      } else {
        return result;
      }
    });
  }

  /**
   * @returns {QueryBuilder}
   */
  first() {
    return this.runAfter(result => {
      if (_.isArray(result)) {
        return result[0];
      } else {
        return result;
      }
    });
  }

  /**
   * @returns {boolean}
   */
  hasSelection(selection) {
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

    if (noSelectStatements) {
      // Implicit `select *`.
      return true;
    } else {
      return false;
    }
  }

  /**
   * @param {Constructor.<Model>=} modelClass
   * @param {function(Model, Model, string)} traverser
   * @returns {QueryBuilder}
   */
  traverse(modelClass, traverser) {
    if (_.isUndefined(traverser)) {
      traverser = modelClass;
      modelClass = null;
    }

    return this.runAfter(result => {
      this._modelClass.traverse(modelClass, result, traverser);
      return result;
    });
  }

  /**
   * @param {Constructor.<Model>=} modelClass
   * @param {Array.<string>} properties
   * @returns {QueryBuilder}
   */
  pick(modelClass, properties) {
    if (_.isUndefined(properties)) {
      properties = modelClass;
      modelClass = null;
    }

    properties = _.reduce(properties, (obj, prop) => {
      obj[prop] = true;
      return obj;
    }, {});

    return this.traverse(modelClass, model => {
      model.$pick(properties);
    });
  }

  /**
   * @param {Constructor.<Model>=} modelClass
   * @param {Array.<string>} properties
   * @returns {QueryBuilder}
   */
  omit(modelClass, properties) {
    if (_.isUndefined(properties)) {
      properties = modelClass;
      modelClass = null;
    }

    // Turn the properties into a hash for performance.
    properties = _.reduce(properties, (obj, prop) => {
      obj[prop] = true;
      return obj;
    }, {});

    return this.traverse(modelClass, model => {
      model.$omit(properties);
    });
  }

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation([JoinRelationOperation, {joinOperation: 'join'}])
  joinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation([JoinRelationOperation, {joinOperation: 'innerJoin'}])
  innerJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation([JoinRelationOperation, {joinOperation: 'outerJoin'}])
  outerJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation([JoinRelationOperation, {joinOperation: 'leftJoin'}])
  leftJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation([JoinRelationOperation, {joinOperation: 'leftOuterJoin'}])
  leftOuterJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation([JoinRelationOperation, {joinOperation: 'rightJoin'}])
  rightJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation([JoinRelationOperation, {joinOperation: 'rightOuterJoin'}])
  rightOuterJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderOperation([JoinRelationOperation, {joinOperation: 'fullOuterJoin'}])
  fullOuterJoinRelation(relationName) {}

  /**
   * @param {string|number|Array.<string|number>} id
   * @returns {QueryBuilder}
   */
  findById(id) {
    return this.whereComposite(this._modelClass.getFullIdColumn(), id).first();
  }

  /**
   * @returns {QueryBuilder}
   */
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

  /**
   * @returns {QueryBuilder}
   */
  debug() {
    this.internalContext().onBuild.push(builder => {
      builder.callKnexQueryBuilderOperation('debug', []);
    });

    return this;
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  insert(modelsOrObjects) {
    const insertOperation = this._insertOperationFactory(this);
    return this.callQueryBuilderOperation(insertOperation, [modelsOrObjects]);
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  insertAndFetch(modelsOrObjects) {
    const insertAndFetchOperation = new InsertAndFetchOperation('insertAndFetch', {
      delegate: this._insertOperationFactory(this)
    });

    return this.callQueryBuilderOperation(insertAndFetchOperation, [modelsOrObjects]);
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  insertGraph(modelsOrObjects) {
    const insertGraphOperation = new InsertGraphOperation('insertGraph', {
      delegate: this._insertOperationFactory(this)
    });

    return this.callQueryBuilderOperation(insertGraphOperation, [modelsOrObjects]);
  }

  /**
   * @returns {QueryBuilder}
   */
  insertWithRelated(...args) {
    return this.insertGraph(...args);
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  insertGraphAndFetch(modelsOrObjects) {
    const insertGraphAndFetchOperation = new InsertGraphAndFetchOperation('insertGraphAndFetch', {
      delegate: new InsertGraphOperation('insertGraph', {
        delegate: this._insertOperationFactory(this)
      })
    });

    return this.callQueryBuilderOperation(insertGraphAndFetchOperation, [modelsOrObjects]);
  }

  /**
   * @returns {QueryBuilder}
   */
  insertWithRelatedAndFetch(...args) {
    return this.insertGraphAndFetch(...args);
  }

  /**
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  update(modelOrObject) {
    const updateOperation = this._updateOperationFactory(this);
    return this.callQueryBuilderOperation(updateOperation, [modelOrObject]);
  }

  /**
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
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

  /**
   * @param {number|string|Array.<number|string>} id
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  updateAndFetchById(id, modelOrObject) {
    const updateAndFetch = new UpdateAndFetchOperation('updateAndFetch', {
      delegate: this._updateOperationFactory(this)
    });

    return this.callQueryBuilderOperation(updateAndFetch, [id, modelOrObject]);
  }

  /**
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  patch(modelOrObject) {
    const patchOperation = this._patchOperationFactory(this);
    return this.callQueryBuilderOperation(patchOperation, [modelOrObject]);
  }

  /**
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
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

  /**
   * @param {number|string|Array.<number|string>} id
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  patchAndFetchById(id, modelOrObject) {
    const patchAndFetch = new UpdateAndFetchOperation('patchAndFetch', {
      delegate: this._patchOperationFactory(this)
    });

    return this.callQueryBuilderOperation(patchAndFetch, [id, modelOrObject]);
  }

  /**
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  delete() {
    const deleteOperation = this._deleteOperationFactory(this);
    return this.callQueryBuilderOperation(deleteOperation, []);
  }

  /**
   * @returns {QueryBuilder}
   */
  del() {
    return this.delete();
  }

  /**
   * @param {number|string|Array.<number|string>} id
   * @returns {QueryBuilder}
   */
  deleteById(id) {
    return this.delete().whereComposite(this._modelClass.getFullIdColumn(), id);
  }

  /**
   * @param {number|string|object|Array.<number|string>|Array.<Array.<number|string>>|Array.<object>} ids
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  relate(ids) {
    const relateOperation = this._relateOperationFactory(this);
    return this.callQueryBuilderOperation(relateOperation, [ids]);
  }

  /**
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  unrelate() {
    const unrelateOperation = this._unrelateOperationFactory(this);
    return this.callQueryBuilderOperation(unrelateOperation, []);
  }

  /**
   * @returns {QueryBuilder}
   */
  increment(propertyName, howMuch) {
    let patch = {};
    let columnName = this._modelClass.propertyNameToColumnName(propertyName);
    patch[propertyName] = this.knex().raw('?? + ?', [columnName, howMuch]);
    return this.patch(patch);
  }

  /**
   * @returns {QueryBuilder}
   */
  decrement(propertyName, howMuch) {
    let patch = {};
    let columnName = this._modelClass.propertyNameToColumnName(propertyName);
    patch[propertyName] = this.knex().raw('?? - ?', [columnName, howMuch]);
    return this.patch(patch);
  }
}

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

  if (!builder.has(/from|table|into/)) {
    // Set the table only if it hasn't been explicitly set yet.
    knexBuilder.table(builder.modelClass().tableName);
  }

  return knexBuilder;
}

function chainHooks(promise, func) {
  if (_.isFunction(func)) {
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
  if (_.isFunction(func)) {
    func.call(builder, builder);
  } else if (_.isArray(func)) {
    for (let i = 0, l = func.length; i < l; ++i) {
      func[i].call(builder, builder);
    }
  }
}

function createHookCaller(hook) {
  const hasMethod = 'has' + _.upperFirst(hook);

  // Compile the caller function for (measured) performance boost.
  const caller = new Function('promise', 'op', `
    if (op.${hasMethod}()) {
      return promise.then(function (result) {
        return op.${hook}(this.builder, result);
      });
    } else {
      return promise;
    }
  `);

  return (promise, operations) => {
    for (let i = 0, l = operations.length; i < l; ++i) {
      promise = caller(promise, operations[i]);
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
