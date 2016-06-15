import _ from 'lodash';
import Promise from 'bluebird';
import queryBuilderOperation from './decorators/queryBuilderOperation';
import QueryBuilderContext from './QueryBuilderContext';
import RelationExpression from './RelationExpression';
import QueryBuilderBase from './QueryBuilderBase';
import ValidationError from '../ValidationError';
import EagerFetcher from './EagerFetcher';
import deprecated from '../utils/decorators/deprecated';

import FindOperation from './operations/FindOperation';
import DeleteOperation from './operations/DeleteOperation';
import UpdateOperation from './operations/UpdateOperation';
import InsertOperation from './operations/InsertOperation';

import InsertWithRelatedOperation from './operations/InsertWithRelatedOperation';
import InsertAndFetchOperation from './operations/InsertAndFetchOperation';
import UpdateAndFetchOperation from './operations/UpdateAndFetchOperation';
import QueryBuilderOperation from './operations/QueryBuilderOperation';
import JoinRelationOperation from './operations/JoinRelationOperation';
import RunBeforeOperation from './operations/RunBeforeOperation';
import RunAfterOperation from './operations/RunAfterOperation';
import OnBuildOperation from './operations/OnBuildOperation';

export default class QueryBuilder extends QueryBuilderBase {

  constructor(modelClass) {
    super(modelClass.knex(), QueryBuilderContext);

    this._modelClass = modelClass;
    this._explicitRejectValue = null;
    this._explicitResolveValue = null;

    this._eagerExpression = null;
    this._eagerFilters = null;
    this._eagerFilterExpressions = [];
    this._allowedEagerExpression = null;
    this._allowedInsertExpression = null;

    this._findOperationFactory = builder => new FindOperation(builder, 'find');
    this._insertOperationFactory = builder => new InsertOperation(builder, 'insert');
    this._updateOperationFactory = builder => new UpdateOperation(builder, 'update');
    this._patchOperationFactory = builder => new UpdateOperation(builder, 'patch', {modelOptions: {patch: true}});
    this._relateOperationFactory = builder => new QueryBuilderOperation(builder, 'relate');
    this._unrelateOperationFactory = builder => new QueryBuilderOperation(builder, 'unrelate');
    this._deleteOperationFactory = builder => new DeleteOperation(builder, 'delete');
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
    this._eagerFilters = filters || null;

    if (_.isString(this._eagerExpression)) {
      this._eagerExpression = RelationExpression.parse(this._eagerExpression);
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
   * @param {function(QueryBuilder)} filter
   * @returns {QueryBuilder}
   */
  filterEager(path, filter) {
    this._eagerFilterExpressions.push({
      path: path,
      filter: filter
    });

    return this;
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
   * @param {function(string)=} logger
   * @returns {QueryBuilder}
   */
  @deprecated({removedIn: '0.6.0', useInstead: 'debug()'})
  dumpSql(logger) {
    (logger || console.log)(this.toString());
    return this;
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
    builder._eagerFilters = this._eagerFilters;
    builder._eagerFilterExpressions = this._eagerFilterExpressions.slice();
    builder._allowedEagerExpression = this._allowedEagerExpression;
    builder._allowedInsertExpression = this._allowedInsertExpression;

    builder._findOperationFactory = this._findOperationFactory;
    builder._insertOperationFactory = this._insertOperationFactory;
    builder._updateOperationFactory = this._updateOperationFactory;
    builder._patchOperationFactory = this._patchOperationFactory;
    builder._relateOperationFactory = this._relateOperationFactory;
    builder._unrelateOperationFactory = this._unrelateOperationFactory;
    builder._deleteOperationFactory = this._deleteOperationFactory;

    return builder;
  }

  /**
   * @returns {QueryBuilder}
   */
  clearEager() {
    this._eagerExpression = null;
    this._eagerFilters = null;
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
    const knex = this._modelClass.knex();

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
    let builder = this.clone();

    if (builder.isFindQuery()) {
      // If no write operations have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._callFindOperation();
    }

    // We need to build the builder even if a query executor operation
    // has been called so that the onBuild hooks get called.
    let knexBuilder = build(builder);
    let queryExecutorOperation = builder._queryExecutorOperation();

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
    let promise = Promise.resolve();
    let context = builder.context() || {};
    let internalContext = builder.internalContext();

    if (builder.isFindQuery()) {
      // If no write operations have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._callFindOperation();
    }

    promise = chainBeforeOperations(promise, builder, builder._operations);
    promise = chainHooks(promise, builder, context.runBefore);
    promise = chainHooks(promise, builder, internalContext.runBefore);
    promise = chainBeforeInternalOperations(promise, builder, builder._operations);

    // Resolve all before hooks before building and executing the query
    // and the rest of the hooks.
    return promise.then(() => {
      // We need to build the builder even if the _explicit(Resolve|Reject)Value or _hooks.executor
      // has been defined so that the onBuild hooks get called.
      let knexBuilder = build(builder);
      let queryExecutorOperation = builder._queryExecutorOperation();
      let promise;

      if (builder._explicitRejectValue) {
        promise = Promise.reject(builder._explicitRejectValue);
      } else if (builder._explicitResolveValue) {
        promise = Promise.resolve(builder._explicitResolveValue);
      } else if (queryExecutorOperation) {
        promise = queryExecutorOperation.queryExecutor(builder);
      } else {
        promise = knexBuilder.then(result => createModels(builder, result));
      }

      promise = chainAfterQueryOperations(promise, builder, builder._operations);
      promise = chainAfterInternalOperations(promise, builder, builder._operations);

      if (builder._eagerExpression) {
        promise = promise.then(models => eagerFetch(builder, models));
      }

      promise = chainHooks(promise, builder, context.runAfter);
      promise = chainHooks(promise, builder, internalContext.runAfter);
      promise = chainAfterOperations(promise, builder, builder._operations);

      return promise;
    });
  }

  /**
   * @private
   * @returns {QueryBuilderOperation}
   */
  _queryExecutorOperation() {
    let executors = _.filter(this._operations, method => method.hasQueryExecutor());

    if (executors.length > 1) {
      throw new Error('there can only be one method call that implements queryExecutor()');
    }

    return executors[0];
  }

  /**
   * @private
   */
  _callFindOperation() {
    if (!this.has(FindOperation)) {
      this.callQueryBuilderOperation(this._findOperationFactory(this), [], /* pushFront = */ true);
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
        builder.callKnexQueryBuilderOperation('withSchema', [schema]);
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
    const insertAndFetchOperation = new InsertAndFetchOperation(this, 'insertAndFetch', {
      delegate: this._insertOperationFactory(this)
    });

    return this.callQueryBuilderOperation(insertAndFetchOperation, [modelsOrObjects]);
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  insertWithRelated(modelsOrObjects) {
    const insertWithRelatedOperation = new InsertWithRelatedOperation(this, 'insertWithRelated', {
      delegate: this._insertOperationFactory(this)
    });

    return this.callQueryBuilderOperation(insertWithRelatedOperation, [modelsOrObjects]);
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
   * @param {number|string|Array.<number|string>} id
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  updateAndFetchById(id, modelOrObject) {
    const updateAndFetch = new UpdateAndFetchOperation(this, 'updateAndFetch', {
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
   * @param {number|string|Array.<number|string>} id
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryOperation
  patchAndFetchById(id, modelOrObject) {
    const patchAndFetch = new UpdateAndFetchOperation(this, 'patchAndFetch', {
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
    patch[propertyName] = this._modelClass.knex().raw('?? + ?', [columnName, howMuch]);
    return this.patch(patch);
  }

  /**
   * @returns {QueryBuilder}
   */
  decrement(propertyName, howMuch) {
    let patch = {};
    let columnName = this._modelClass.propertyNameToColumnName(propertyName);
    patch[propertyName] = this._modelClass.knex().raw('?? - ?', [columnName, howMuch]);
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

function createModels(builder, result) {
  if (_.isNull(result) || _.isUndefined(result)) {
    return null;
  }

  if (_.isArray(result)) {
    if (result.length > 0 && _.isObject(result[0])) {
      for (let i = 0, l = result.length; i < l; ++i) {
        result[i] = builder._modelClass.fromDatabaseJson(result[i]);
      }
    }
  } else if (_.isObject(result)) {
    result = builder._modelClass.fromDatabaseJson(result);
  }

  return result;
}

function eagerFetch(builder, $models) {
  if ($models instanceof builder._modelClass || (_.isArray($models) && $models[0] instanceof builder._modelClass)) {
    let expression = builder._eagerExpression.clone();
    let filters = _.clone(builder._eagerFilters || {});

    _.each(builder._eagerFilterExpressions, (filter, idx) => {
      let filterNodes = expression.expressionsAtPath(filter.path);

      if (!_.isEmpty(filterNodes)) {
        const filterName = `_efe${idx}_`;
        filters[filterName] = filter.filter;
        _.each(filterNodes, node => node.args.push(filterName));
      }
    });

    return new EagerFetcher({
      modelClass: builder._modelClass,
      models: builder._modelClass.ensureModelArray($models),
      eager: expression,
      filters: filters,
      rootQuery: builder
    }).fetch().then(function (models) {
      return _.isArray($models) ? models : models[0];
    });
  } else {
    return $models;
  }
}

function build(builder) {
  let context = builder.context() || {};
  let internalContext = builder.internalContext();
  let knexBuilder = builder.knex().queryBuilder();

  if (!builder.has(/from|table|into/)) {
    // Set the table only if it hasn't been explicitly set yet.
    builder.table(builder.modelClass().tableName);
  }

  callOnBuildHooks(builder, context.onBuild);
  callOnBuildHooks(builder, internalContext.onBuild);

  return builder.buildInto(knexBuilder);
}

function callOnBuildHooks(builder, func) {
  if (_.isFunction(func)) {
    func.call(builder, builder);
  } else if (_.isArray(func)) {
    _.each(func, func => {
      func.call(builder, builder);
    });
  }
}

function chainHooks(promise, builder, func) {
  if (_.isFunction(func)) {
    promise = promise.then(result => func.call(builder, result, builder));
  } else if (_.isArray(func)) {
    _.each(func, func => {
      promise = promise.then(result => func.call(builder, result, builder));
    });
  }

  return promise;
}

function chainBeforeOperations(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onBefore(builder, res);
  }, method => {
    return method.hasOnBefore();
  });
}

function chainBeforeInternalOperations(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onBeforeInternal(builder, res);
  }, method => {
    return method.hasOnBeforeInternal();
  });
}

function chainAfterQueryOperations(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onAfterQuery(builder, res);
  }, method => {
    return method.hasOnAfterQuery();
  });
}

function chainAfterOperations(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onAfter(builder, res);
  }, method => {
    return method.hasOnAfter();
  });
}

function chainAfterInternalOperations(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onAfterInternal(builder, res);
  }, method => {
    return method.hasOnAfterInternal();
  });
}

function promiseChain(promise, items, call, has) {
  _.each(items, item => {
    if (!has(item)) {
      return;
    }

    promise = promise.then(res => {
      return call(res, item);
    });
  });

  return promise;
}