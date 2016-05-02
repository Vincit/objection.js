import _ from 'lodash';
import Promise from 'bluebird';
import queryBuilderMethod from './decorators/queryBuilderMethod';
import QueryBuilderContext from './QueryBuilderContext';
import RelationExpression from './RelationExpression';
import QueryBuilderBase from './QueryBuilderBase';
import ValidationError from '../ValidationError';
import EagerFetcher from './EagerFetcher';
import deprecated from '../utils/decorators/deprecated';

import DeleteMethod from './methods/DeleteMethod';
import UpdateMethod from './methods/UpdateMethod';
import InsertMethod from './methods/InsertMethod';

import InsertWithRelatedMethod from './methods/InsertWithRelatedMethod';
import InsertAndFetchMethod from './methods/InsertAndFetchMethod';
import UpdateAndFetchMethod from './methods/UpdateAndFetchMethod';
import QueryBuilderMethod from './methods/QueryBuilderMethod';
import JoinRelationMethod from './methods/JoinRelationMethod';
import RunBeforeMethod from './methods/RunBeforeMethod';
import RunAfterMethod from './methods/RunAfterMethod';
import OnBuildMethod from './methods/OnBuildMethod';

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

    this._findMethodFactory = builder => new QueryBuilderMethod(builder, 'find');
    this._insertMethodFactory = builder => new InsertMethod(builder, 'insert');
    this._updateMethodFactory = builder => new UpdateMethod(builder, 'update');
    this._patchMethodFactory = builder => new UpdateMethod(builder, 'patch', {modelOptions: {patch: true}});
    this._relateMethodFactory = builder => new QueryBuilderMethod(builder, 'relate');
    this._unrelateMethodFactory = builder => new QueryBuilderMethod(builder, 'unrelate');
    this._deleteMethodFactory = builder => new DeleteMethod(builder, 'delete');
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
    const hasExecutor = !!this._queryExecutorMethod();
    return !this._explicitRejectValue && !this._explicitResolveValue && !hasExecutor;
  }

  /**
   * @param {function(*, QueryBuilder)} runBefore
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod(RunBeforeMethod)
  runBefore(runBefore) {}

  /**
   * @param {function(QueryBuilder)} onBuild
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod(OnBuildMethod)
  onBuild(onBuild) {}

  /**
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfter
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod(RunAfterMethod)
  runAfter(runAfter) {}

  /**
   * @param {function(QueryBuilder):QueryBuilderMethod} factory
   * @returns {QueryBuilder}
   */
  findMethodFactory(factory) {
    this._findMethodFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderMethod} factory
   * @returns {QueryBuilder}
   */
  insertMethodFactory(factory) {
    this._insertMethodFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderMethod} factory
   * @returns {QueryBuilder}
   */
  updateMethodFactory(factory) {
    this._updateMethodFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderMethod} factory
   * @returns {QueryBuilder}
   */
  patchMethodFactory(factory) {
    this._patchMethodFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderMethod} factory
   * @returns {QueryBuilder}
   */
  deleteMethodFactory(factory) {
    this._deleteMethodFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderMethod} factory
   * @returns {QueryBuilder}
   */
  relateMethodFactory(factory) {
    this._relateMethodFactory = factory;
    return this;
  }

  /**
   * @param {function(QueryBuilder):QueryBuilderMethod} factory
   * @returns {QueryBuilder}
   */
  unrelateMethodFactory(factory) {
    this._unrelateMethodFactory = factory;
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
    return !_.some(this._methodCalls, method => method.isWriteMethod) && !this._explicitRejectValue;
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

    builder._findMethodFactory = this._findMethodFactory;
    builder._insertMethodFactory = this._insertMethodFactory;
    builder._updateMethodFactory = this._updateMethodFactory;
    builder._patchMethodFactory = this._patchMethodFactory;
    builder._relateMethodFactory = this._relateMethodFactory;
    builder._unrelateMethodFactory = this._unrelateMethodFactory;
    builder._deleteMethodFactory = this._deleteMethodFactory;

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
    var promise = this._execute();
    return promise.then.apply(promise, arguments);
  }

  /**
   * @param {function} mapper
   * @returns {Promise}
   */
  map(mapper) {
    var promise = this._execute();
    return promise.map.apply(promise, arguments);
  }

  /**
   * @param {function} errorHandler
   * @returns {Promise}
   */
  catch(errorHandler) {
    var promise = this._execute();
    return promise.catch.apply(promise, arguments);
  }

  /**
   * @param {*} returnValue
   * @returns {Promise}
   */
  return(returnValue) {
    var promise = this._execute();
    return promise.return.apply(promise, arguments);
  }

  /**
   * @param {*} context
   * @returns {Promise}
   */
  bind(context) {
    var promise = this._execute();
    return promise.bind.apply(promise, arguments);
  }

  /**
   * @param {function} callback
   * @returns {Promise}
   */
  asCallback(callback) {
    var promise = this._execute();
    return promise.asCallback.apply(promise, arguments);
  }

  /**
   * @param {function} callback
   * @returns {Promise}
   */
  nodeify(callback) {
    var promise = this._execute();
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
      // If no write methods have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._callFindMethod();
    }

    // We need to build the builder even if the _hooks.executor function
    // has been defined so that the onBuild hooks get called.
    let knexBuilder = build(builder);
    let queryExecutorMethod = builder._queryExecutorMethod();

    if (queryExecutorMethod) {
      // If the query executor is set, we build the builder that it returns.
      return queryExecutorMethod.queryExecutor(builder).build();
    } else {
      return knexBuilder;
    }
  }

  /**
   * @private
   * @returns {QueryBuilderMethod}
   */
  _queryExecutorMethod() {
    let executors = _.filter(this._methodCalls, method => method.hasQueryExecutor());

    if (executors.length > 1) {
      throw new Error('there can only be one method call that implements queryExecutor()');
    }

    return executors[0];
  }

  /**
   * @private
   */
  _callFindMethod() {
    this.callQueryBuilderMethod(this._findMethodFactory(this), []);
  }

  /**
   * @private
   * @returns {Promise}
   */
  _execute() {
    // Take a clone so that we don't modify this instance during execution.
    // The hooks and onBuild callbacks usually modify the query and we want
    // this builder to be re-executable.
    let builder = this.clone();
    let promise = Promise.resolve();
    let context = builder.context() || {};
    let internalContext = builder.internalContext();

    if (builder.isFindQuery()) {
      // If no write methods have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._callFindMethod();
    }

    promise = chainBeforeMethods(promise, builder, builder._methodCalls);
    promise = chainBeforeBackMethods(promise, builder, builder._methodCalls);
    promise = chainHooks(promise, builder, context.runBefore);
    promise = chainHooks(promise, builder, internalContext.runBefore);

    // Resolve all before hooks before building and executing the query
    // and the rest of the hooks.
    return promise.then(() => {
      // We need to build the builder even if the _explicit(Resolve|Reject)Value or _hooks.executor
      // has been defined so that the onBuild hooks get called.
      let knexBuilder = build(builder);
      let queryExecutorMethod = builder._queryExecutorMethod();
      let promise;

      if (builder._explicitRejectValue) {
        promise = Promise.reject(builder._explicitRejectValue);
      } else if (builder._explicitResolveValue) {
        promise = Promise.resolve(builder._explicitResolveValue);
      } else if (queryExecutorMethod) {
        promise = queryExecutorMethod.queryExecutor(builder);
      } else {
        promise = knexBuilder.then(result => createModels(builder, result));
      }

      promise = chainAfterModelCreateFrontMethods(promise, builder, builder._methodCalls);
      promise = chainAfterModelCreateMethods(promise, builder, builder._methodCalls);

      if (builder._eagerExpression) {
        promise = promise.then(models => eagerFetch(builder, models));
      }

      promise = chainHooks(promise, builder, context.runAfter);
      promise = chainHooks(promise, builder, internalContext.runAfter);
      promise = chainAfterMethods(promise, builder, builder._methodCalls);

      return promise;
    });
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
  @queryBuilderMethod([JoinRelationMethod, {joinMethod: 'join'}])
  joinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod([JoinRelationMethod, {joinMethod: 'innerJoin'}])
  innerJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod([JoinRelationMethod, {joinMethod: 'outerJoin'}])
  outerJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod([JoinRelationMethod, {joinMethod: 'leftJoin'}])
  leftJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod([JoinRelationMethod, {joinMethod: 'leftOuterJoin'}])
  leftOuterJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod([JoinRelationMethod, {joinMethod: 'rightJoin'}])
  rightJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod([JoinRelationMethod, {joinMethod: 'rightOuterJoin'}])
  rightOuterJoinRelation(relationName) {}

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  @queryBuilderMethod([JoinRelationMethod, {joinMethod: 'fullOuterJoin'}])
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
        builder.callKnexQueryBuilderMethod('withSchema', [schema]);
      }
    });

    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  debug() {
    this.internalContext().onBuild.push(builder => {
      builder.callKnexQueryBuilderMethod('debug', []);
    });

    return this;
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  insert(modelsOrObjects) {
    const insertMethod = this._insertMethodFactory(this);
    return this.callQueryBuilderMethod(insertMethod, [modelsOrObjects]);
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  insertAndFetch(modelsOrObjects) {
    const insertAndFetchMethod = new InsertAndFetchMethod(this, 'insertAndFetch', {
      delegate: this._insertMethodFactory(this)
    });

    return this.callQueryBuilderMethod(insertAndFetchMethod, [modelsOrObjects]);
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  insertWithRelated(modelsOrObjects) {
    const insertWithRelatedMethod = new InsertWithRelatedMethod(this, 'insertWithRelated', {
      delegate: this._insertMethodFactory(this)
    });

    return this.callQueryBuilderMethod(insertWithRelatedMethod, [modelsOrObjects]);
  }

  /**
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  update(modelOrObject) {
    const updateMethod = this._updateMethodFactory(this);
    return this.callQueryBuilderMethod(updateMethod, [modelOrObject]);
  }

  /**
   * @param {number|string|Array.<number|string>} id
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  updateAndFetchById(id, modelOrObject) {
    const updateAndFetch = new UpdateAndFetchMethod(this, 'updateAndFetch', {
      delegate: this._updateMethodFactory(this)
    });

    return this.callQueryBuilderMethod(updateAndFetch, [id, modelOrObject]);
  }

  /**
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  patch(modelOrObject) {
    const patchMethod = this._patchMethodFactory(this);
    return this.callQueryBuilderMethod(patchMethod, [modelOrObject]);
  }

  /**
   * @param {number|string|Array.<number|string>} id
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  patchAndFetchById(id, modelOrObject) {
    const patchAndFetch = new UpdateAndFetchMethod(this, 'patchAndFetch', {
      delegate: this._patchMethodFactory(this)
    });

    return this.callQueryBuilderMethod(patchAndFetch, [id, modelOrObject]);
  }

  /**
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  delete() {
    const deleteMethod = this._deleteMethodFactory(this);
    return this.callQueryBuilderMethod(deleteMethod, []);
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
  @writeQueryMethod
  relate(ids) {
    const relateMethod = this._relateMethodFactory(this);
    return this.callQueryBuilderMethod(relateMethod, [ids]);
  }

  /**
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  unrelate() {
    const unrelateMethod = this._unrelateMethodFactory(this);
    return this.callQueryBuilderMethod(unrelateMethod, []);
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

function writeQueryMethod(target, property, descriptor) {
  const func = descriptor.value;

  descriptor.value = function decorator$writeQueryMethod() {
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

function chainBeforeMethods(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onBefore(builder, res);
  }, method => {
    return method.hasOnBefore();
  });
}

function chainBeforeBackMethods(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onBeforeBack(builder, res);
  }, method => {
    return method.hasOnBeforeBack();
  });
}

function chainAfterModelCreateFrontMethods(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onAfterModelCreateFront(builder, res);
  }, method => {
    return method.hasOnAfterModelCreateFront();
  });
}

function chainAfterMethods(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onAfter(builder, res);
  }, method => {
    return method.hasOnAfter();
  });
}

function chainAfterModelCreateMethods(promise, builder, methods) {
  return promiseChain(promise, methods, (res, method) => {
    return method.onAfterModelCreate(builder, res);
  }, method => {
    return method.hasOnAfterModelCreate();
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