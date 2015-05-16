"use strict";

var _ = require('lodash')
  , Promise = require('bluebird');

/**
 *
 * ```
 *      [run custom methods]
 *  [defined by insertImpl etc.]
 *               |
 *               ▼
 *          [build query]
 *               |
 *               ▼
 *           runBefore
 *               |
 *               ▼
 *         [execute query]
 *               |
 *               ▼
 *       runAfterKnexQuery
 *               |
 *               ▼
 * [convert result to MoronModels]
 *               |
 *               ▼
 *       runAfterModelCreate
 *               |
 *               ▼
 *         [eager fetch]
 *               |
 *               ▼
 *            runAfter
 * ```
 * @constructor
 */
function MoronQueryBuilder(modelClass) {
  this._modelClass = modelClass;
  this._transaction = modelClass.transaction || null;
  this._knexCalls = {};
  this._explicitResolveValue = null;

  this._runBefore = [];
  this._runAfterKnexQuery = [];
  this._runAfterModelCreate = [];
  this._runAfter = [];

  this._findImpl = null;
  this._insertImpl = null;
  this._updateImpl = null;
  this._patchImpl = null;
  this._deleteImpl = null;
  this._relateImpl = null;
  this._unrelateImpl = null;

  this._eagerExpression = null;
  this._allowedExpression = null;
}

MoronQueryBuilder.forClass = function (modelClass) {
  return new this(modelClass);
};

MoronQueryBuilder.prototype.resolve = function (resolve) {
  this._explicitResolveValue = resolve;
  return this;
};

MoronQueryBuilder.prototype.runBefore = function (runBefore) {
  this._runBefore.push(runBefore);
  return this;
};

MoronQueryBuilder.prototype.runBeforePushFront = function (runBefore) {
  this._runBefore.unshift(runBefore);
  return this;
};

MoronQueryBuilder.prototype.runAfterKnexQuery = function (runAfterKnexQuery) {
  this._runAfterKnexQuery.push(runAfterKnexQuery);
  return this;
};

MoronQueryBuilder.prototype.runAfterKnexQueryPushFront = function (runAfterKnexQuery) {
  this._runAfterKnexQuery.unshift(runAfterKnexQuery);
  return this;
};

MoronQueryBuilder.prototype.runAfterModelCreate = function (runAfterModelCreate) {
  this._runAfterModelCreate.push(runAfterModelCreate);
  return this;
};

MoronQueryBuilder.prototype.runAfterModelCreatePushFront = function (runAfterModelCreate) {
  this._runAfterModelCreate.unshift(runAfterModelCreate);
  return this;
};

MoronQueryBuilder.prototype.runAfter = function (runAfter) {
  this._runAfter.push(runAfter);
  return this;
};

MoronQueryBuilder.prototype.runAfterPushFront = function (runAfter) {
  this._runAfter.unshift(runAfter);
  return this;
};

MoronQueryBuilder.prototype.findImpl = function (findImpl) {
  this._findImpl = findImpl;
  return this;
};

MoronQueryBuilder.prototype.insertImpl = function (insertImpl) {
  this._insertImpl = insertImpl;
  return this;
};

MoronQueryBuilder.prototype.updateImpl = function (updateImpl) {
  this._updateImpl = updateImpl;
  return this;
};

MoronQueryBuilder.prototype.patchImpl = function (patchImpl) {
  this._patchImpl = patchImpl;
  return this;
};

MoronQueryBuilder.prototype.deleteImpl = function (deleteImpl) {
  this._deleteImpl = deleteImpl;
  return this;
};

MoronQueryBuilder.prototype.relateImpl = function (relateImpl) {
  this._relateImpl = relateImpl;
  return this;
};

MoronQueryBuilder.prototype.unrelateImpl = function (unrelateImpl) {
  this._unrelateImpl = unrelateImpl;
  return this;
};

MoronQueryBuilder.prototype.transacting = function (transaction) {
  this._transaction = transaction;
  return this;
};

MoronQueryBuilder.prototype.eager = function (exp) {
  this._eagerExpression = _.isFunction(exp) ? exp.call(this) : (exp || null);
  return this;
};

MoronQueryBuilder.prototype.allowEager = function (exp) {
  this._allowedExpression = _.isFunction(exp) ? exp.call(this) : (exp || null);
  return this;
};

MoronQueryBuilder.prototype.call = function (func) {
  func.call(this);
  return this;
};

MoronQueryBuilder.prototype.modelClass = function () {
  return this._modelClass;
};

MoronQueryBuilder.prototype.transaction = function () {
  return this._transaction;
};

MoronQueryBuilder.prototype.isFindQuery = function () {
  return _.isEmpty(this._knexCalls.insert) &&
    _.isEmpty(this._knexCalls.update) &&
    _.isEmpty(this._knexCalls.patch) &&
    _.isEmpty(this._knexCalls.delete) &&
    _.isEmpty(this._knexCalls.relate) &&
    _.isEmpty(this._knexCalls.unrelate);
};

MoronQueryBuilder.prototype.toString = function () {
  return this.build().toString();
};

MoronQueryBuilder.prototype.toSql = function () {
  return this.toString();
};

MoronQueryBuilder.prototype.dumpSql = function (logger) {
  (logger || console.log)(this.toString());
  return this;
};

MoronQueryBuilder.prototype.clone = function () {
  var clone = new this.constructor(this._modelClass);

  // Simple two-level deep copy.
  clone._knexCalls = _.mapValues(this._knexCalls, function (calls) {
    return _.map(calls, _.identity);
  });

  clone._explicitResolveValue = this._explicitResolveValue;
  clone._runBefore = _.map(this._runBefore, _.identity);
  clone._runAfterKnexQuery = _.map(this._runAfterKnexQuery, _.identity);
  clone._runAfterModelCreate = _.map(this._runAfterModelCreate, _.identity);
  clone._runAfter = _.map(this._runAfter, _.identity);
  clone._findImpl = this._findImpl;
  clone._insertImpl = this._insertImpl;
  clone._updateImpl = this._updateImpl;
  clone._patchImpl = this._patchImpl;
  clone._deleteImpl = this._deleteImpl;
  clone._relateImpl = this._relateImpl;
  clone._unrelateImpl = this._unrelateImpl;
  clone._eagerExpression = this._eagerExpression;
  clone._allowedExpression = this._allowedExpression;

  return clone;
};

MoronQueryBuilder.prototype.clearCustomImpl = function () {
  this._findImpl = null;
  this._insertImpl = null;
  this._updateImpl = null;
  this._patchImpl = null;
  this._deleteImpl = null;
  this._relateImpl = null;
  this._unrelateImpl = null;
  return this;
};

MoronQueryBuilder.prototype.clearAllBut = function () {
  var self = this;
  var args = _.toArray(arguments);

  _.each(this._knexCalls, function (calls, methodName) {
    if (!_.contains(args, methodName)) {
      self._knexCalls[methodName] = [];
    }
  });

  return this;
};

MoronQueryBuilder.prototype.clear = function () {
  if (arguments.length) {
    for (var i = 0; i < arguments.length; ++i) {
      this._knexCalls[arguments[i]] = [];
    }
  } else {
    this._knexCalls = {};
  }

  return this;
};

MoronQueryBuilder.prototype.has = function (methodName) {
  return !_.isEmpty(this._knexCalls[methodName]);
};

MoronQueryBuilder.prototype.then = function (success, error) {
  return this._execute().then(success, error);
};

MoronQueryBuilder.prototype.map = function (mapper) {
  return this._execute().map(mapper);
};

MoronQueryBuilder.prototype.catch = function (error) {
  return this._execute().catch(error);
};

MoronQueryBuilder.prototype.return = function (retVal) {
  return this._execute().return(retVal);
};

MoronQueryBuilder.prototype.bind = function (context) {
  return this._execute().bind(context);
};

MoronQueryBuilder.prototype.resultSize = function () {
  var knex = this._modelClass.knex;
  // orderBy is useless here and it can make things a lot slower (at least with postgresql 9.3).
  // Remove it from the count query.
  var query = this.clone().clear('orderBy').build();

  var rawQuery = knex.raw(query).wrap('(', ') as temp');
  var countQuery = knex.count('* as count').from(rawQuery);

  return countQuery.transacting(this._transaction).then(function (result) {
    return result[0] ? result[0].count : 0;
  });
};

MoronQueryBuilder.prototype.page = function (page, pageSize) {
  return this.range(page * pageSize, (page + 1) * pageSize - 1);
};

MoronQueryBuilder.prototype.range = function (start, end) {
  return Promise.all([
    this.resultSize(),
    this.limit(end - start + 1).offset(start)
  ]).spread(function (total, results) {
    return {
      results: results,
      total: total
    };
  });
};

MoronQueryBuilder.prototype.build = function () {
  return this.constructor.build(this.clone());
};

MoronQueryBuilder.build = function (builder) {
  var isFindQuery = builder.isFindQuery();

  var inserts = builder._knexCalls.insert;
  var updates = builder._knexCalls.update;
  var patches = builder._knexCalls.patch;
  var deletes = builder._knexCalls.delete;
  var relates = builder._knexCalls.relate;
  var unrelates = builder._knexCalls.unrelate;

  if (builder._insertImpl) {
    builder._knexCalls.insert = [];
  }

  if (builder._updateImpl) {
    builder._knexCalls.update = [];
  }

  if (builder._patchImpl) {
    builder._knexCalls.patch = [];
  }

  if (builder._deleteImpl) {
    builder._knexCalls.delete = [];
  }

  if (builder._relateImpl) {
    builder._knexCalls.relate = [];
  }

  if (builder._unrelateImpl) {
    builder._knexCalls.unrelate = [];
  }

  if (builder._insertImpl) {
    _.each(inserts, function (args) {
      builder._insertImpl.apply(builder, args);
    });
  }

  if (builder._updateImpl) {
    _.each(updates, function (args) {
      builder._updateImpl.apply(builder, args);
    });
  }

  if (builder._patchImpl) {
    _.each(patches, function (args) {
      builder._patchImpl.apply(builder, args);
    });
  }

  if (builder._deleteImpl) {
    _.each(deletes, function (args) {
      builder._deleteImpl.apply(builder, args);
    });
  }

  if (builder._relateImpl) {
    _.each(relates, function (args) {
      builder._relateImpl.apply(builder, args);
    });
  }

  if (builder._unrelateImpl) {
    _.each(unrelates, function (args) {
      builder._unrelateImpl.apply(builder, args);
    });
  }

  if (builder._findImpl && isFindQuery) {
    builder._findImpl.call(builder);
  }

  var knexBuilder = builder._modelClass.knexQuery(builder._transaction);

  _.each(builder._knexCalls, function (calls, methodName) {
    if (_.isFunction(knexBuilder[methodName])) {
      _.each(calls, function (args) {
        knexBuilder[methodName].apply(knexBuilder, args);
      });
    }
  });

  return knexBuilder;
};

MoronQueryBuilder.prototype._execute = function () {
  var builder = this.clone();
  var promise = Promise.resolve();
  var knexBuilder = null;

  if (!builder._explicitResolveValue) {
    knexBuilder = builder.constructor.build(builder);
  }

  _.each(builder._runBefore, function (func) {
    promise = promise.then(function (result) {
      return func.call(builder, result);
    });
  });

  promise = promise.then(function () {
    return builder._explicitResolveValue || knexBuilder;
  });

  _.each(builder._runAfterKnexQuery, function (func) {
    promise = promise.then(function (result) {
      return func.call(builder, result);
    });
  });

  promise = promise.then(function (result) {
    return createModels(builder, result)
  });

  _.each(builder._runAfterModelCreate, function (func) {
    promise = promise.then(function (result) {
      return func.call(builder, result);
    });
  });

  promise = promise.then(function (models) {
    return eagerFetch(builder, models);
  });

  _.each(builder._runAfter, function (func) {
    promise = promise.then(function (result) {
      return func.call(builder, result);
    });
  });

  return promise;
};

MoronQueryBuilder.prototype.insert            = queryMethod('insert');
MoronQueryBuilder.prototype.update            = queryMethod('update');
MoronQueryBuilder.prototype.patch             = queryMethod('patch');
MoronQueryBuilder.prototype.delete            = queryMethod('delete');
MoronQueryBuilder.prototype.del               = queryMethod('delete');
MoronQueryBuilder.prototype.relate            = queryMethod('relate');
MoronQueryBuilder.prototype.unrelate          = queryMethod('unrelate');
MoronQueryBuilder.prototype.select            = queryMethod('select');
MoronQueryBuilder.prototype.columns           = queryMethod('columns');
MoronQueryBuilder.prototype.column            = queryMethod('column');
MoronQueryBuilder.prototype.from              = queryMethod('from');
MoronQueryBuilder.prototype.into              = queryMethod('into');
MoronQueryBuilder.prototype.table             = queryMethod('table');
MoronQueryBuilder.prototype.distinct          = queryMethod('distinct');
MoronQueryBuilder.prototype.join              = queryMethod('join');
MoronQueryBuilder.prototype.innerJoin         = queryMethod('innerJoin');
MoronQueryBuilder.prototype.leftJoin          = queryMethod('leftJoin');
MoronQueryBuilder.prototype.leftOuterJoin     = queryMethod('leftOuterJoin');
MoronQueryBuilder.prototype.rightJoin         = queryMethod('rightJoin');
MoronQueryBuilder.prototype.rightOuterJoin    = queryMethod('rightOuterJoin');
MoronQueryBuilder.prototype.outerJoin         = queryMethod('outerJoin');
MoronQueryBuilder.prototype.fullOuterJoin     = queryMethod('fullOuterJoin');
MoronQueryBuilder.prototype.crossJoin         = queryMethod('crossJoin');
MoronQueryBuilder.prototype.where             = queryMethod('where');
MoronQueryBuilder.prototype.andWhere          = queryMethod('andWhere');
MoronQueryBuilder.prototype.orWhere           = queryMethod('orWhere');
MoronQueryBuilder.prototype.whereRaw          = queryMethod('whereRaw');
MoronQueryBuilder.prototype.whereWrapped      = queryMethod('whereWrapped');
MoronQueryBuilder.prototype.orWhereRaw        = queryMethod('orWhereRaw');
MoronQueryBuilder.prototype.whereExists       = queryMethod('whereExists');
MoronQueryBuilder.prototype.orWhereExists     = queryMethod('orWhereExists');
MoronQueryBuilder.prototype.whereNotExists    = queryMethod('whereNotExists');
MoronQueryBuilder.prototype.orWhereNotExists  = queryMethod('orWhereNotExists');
MoronQueryBuilder.prototype.whereIn           = queryMethod('whereIn');
MoronQueryBuilder.prototype.orWhereIn         = queryMethod('orWhereIn');
MoronQueryBuilder.prototype.whereNotIn        = queryMethod('whereNotIn');
MoronQueryBuilder.prototype.orWhereNotIn      = queryMethod('orWhereNotIn');
MoronQueryBuilder.prototype.whereNull         = queryMethod('whereNull');
MoronQueryBuilder.prototype.orWhereNull       = queryMethod('orWhereNull');
MoronQueryBuilder.prototype.whereNotNull      = queryMethod('whereNotNull');
MoronQueryBuilder.prototype.orWhereNotNull    = queryMethod('orWhereNotNull');
MoronQueryBuilder.prototype.whereBetween      = queryMethod('whereBetween');
MoronQueryBuilder.prototype.whereNotBetween   = queryMethod('whereNotBetween');
MoronQueryBuilder.prototype.orWhereBetween    = queryMethod('orWhereBetween');
MoronQueryBuilder.prototype.orWhereNotBetween = queryMethod('orWhereNotBetween');
MoronQueryBuilder.prototype.groupBy           = queryMethod('groupBy');
MoronQueryBuilder.prototype.orderBy           = queryMethod('orderBy');
MoronQueryBuilder.prototype.union             = queryMethod('union');
MoronQueryBuilder.prototype.unionAll          = queryMethod('unionAll');
MoronQueryBuilder.prototype.having            = queryMethod('having');
MoronQueryBuilder.prototype.havingRaw         = queryMethod('havingRaw');
MoronQueryBuilder.prototype.orHaving          = queryMethod('orHaving');
MoronQueryBuilder.prototype.orHavingRaw       = queryMethod('orHavingRaw');
MoronQueryBuilder.prototype.offset            = queryMethod('offset');
MoronQueryBuilder.prototype.limit             = queryMethod('limit');
MoronQueryBuilder.prototype.count             = queryMethod('count');
MoronQueryBuilder.prototype.min               = queryMethod('min');
MoronQueryBuilder.prototype.max               = queryMethod('max');
MoronQueryBuilder.prototype.sum               = queryMethod('sum');
MoronQueryBuilder.prototype.avg               = queryMethod('avg');
MoronQueryBuilder.prototype.increment         = queryMethod('increment');
MoronQueryBuilder.prototype.decrement         = queryMethod('decrement');
MoronQueryBuilder.prototype.first             = queryMethod('first');
MoronQueryBuilder.prototype.debug             = queryMethod('debug');
MoronQueryBuilder.prototype.pluck             = queryMethod('pluck');
MoronQueryBuilder.prototype.returning         = queryMethod('returning');
MoronQueryBuilder.prototype.truncate          = queryMethod('truncate');

function queryMethod(methodName) {
  return function () {
    this._knexCalls[methodName] = this._knexCalls[methodName] || [];
    this._knexCalls[methodName].push(_.toArray(arguments));
    return this;
  };
}

function createModels(builder, result) {
  if (_.isNull(result) || _.isUndefined(result)) {
    return null;
  }

  if (_.isArray(result)) {
    if (result.length > 0 && _.isObject(result[0])) {
      for (var i = 0, l = result.length; i < l; ++i) {
        result[i] = builder._modelClass.fromDatabaseJson(result[i]);
      }
    }
  } else if (_.isObject(result)) {
    result = builder._modelClass.fromDatabaseJson(result);
  }

  return result;
}

function eagerFetch(builder, models) {
  if (models instanceof builder._modelClass || (_.isArray(models) && models[0] instanceof builder._modelClass)) {
    return builder._modelClass.loadRelated(models, builder._eagerExpression, builder._allowedExpression);
  } else {
    return models;
  }
}

module.exports = MoronQueryBuilder;
