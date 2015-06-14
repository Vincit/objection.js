'use strict';

var _ = require('lodash')
  , Promise = require('bluebird')
  , MoronRelationExpression = require('./MoronRelationExpression')
  , MoronValidationError = require('./MoronValidationError');

/**
 * Query builder for MoronModels.
 *
 * This class is a wrapper around <a href="http://knexjs.org#Builder">knex QueryBuilder</a>.
 * MoronQueryBuilder has all the methods a knex QueryBuilder has and more. While knex
 * QueryBuilder returns plain javascript objects, MoronQueryBuilder returns MoronModel
 * subclass instances.
 *
 * MoronQueryBuilder is thenable, meaning that it can be used like a promise. You can
 * return query builder from a `.then` method of a promise and it gets chained just like
 * a normal promise would.
 *
 * The query is executed when one of its promise methods `then()`, `catch()`, `map()`,
 * `bind()` or `return()` is called. Also calling either of the paging methods `page()`
 * or `range()` will execute the query.
 *
 * @constructor
 */
function MoronQueryBuilder(modelClass) {
  this._modelClass = modelClass;
  this._knexCalls = {};
  this._explicitResolveValue = null;
  this._explicitRejectValue = null;

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
  this._allowedEagerExpression = null;
}

/**
 * Create MoronQueryBuilder for a MoronModel subclass.
 *
 * @param {MoronModel} modelClass
 *    MoronModel subclass.
 */
MoronQueryBuilder.forClass = function (modelClass) {
  return new this(modelClass);
};

/**
 * Skips the database query and "fakes" its result.
 *
 * @param {Array.<Object>} resolve
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.resolve = function (resolve) {
  this._explicitResolveValue = resolve;
  return this;
};

/**
 * Skips the database query and "fakes" an error result.
 *
 * @param {Error} error
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.reject = function (error) {
  this._explicitRejectValue = error;
  return this;
};

/**
 * Registers a function to be called before the database query once the builder is executed.
 *
 * Multiple functions can be chained like `.then` methods of a promise.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .runBefore(function () {
 *    console.log('hello 1');
 *
 *    return Promise.delay(10).then(function () {
 *      console.log('hello 2');
 *    });
 *  })
 *  .runBefore(function () {
 *    console.log('hello 3');
 *  });
 *
 * query.then();
 * // --> hello 1
 * // --> hello 2
 * // --> hello 3
 * ```
 *
 * @param {function} runBefore
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.runBefore = function (runBefore) {
  this._runBefore.push(runBefore);
  return this;
};

/**
 * Just like `runBefore` but pushes the function before any other runBefore functions.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .runBefore(function () {
 *    console.log('hello 1');
 *  })
 *  .runBeforePushFront(function () {
 *    console.log('hello 2');
 *  });
 *
 * query.then();
 * // --> hello 2
 * // --> hello 1
 * ```
 */
MoronQueryBuilder.prototype.runBeforePushFront = function (runBefore) {
  this._runBefore.unshift(runBefore);
  return this;
};

/**
 * Registers a function to be called after the database query once the builder is executed.
 *
 * Multiple functions can be chained like `.then` methods of a promise.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .runAfterKnexQuery(function (rows) {
 *    return rows;
 *  })
 *  .runAfterKnexQuery(function (rows) {
 *    rows.push({firstName: 'Jennifer'});
 *  });
 *
 * query.then(function (models) {
 *   var jennifer = models[models.length - 1];
 * });
 * ```
 *
 * @param {function} runAfterKnexQuery
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.runAfterKnexQuery = function (runAfterKnexQuery) {
  this._runAfterKnexQuery.push(runAfterKnexQuery);
  return this;
};

/**
 * Just like `runAfterKnexQuery` but pushes the function before any other runAfterKnexQuery functions.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .runAfterKnexQuery(function (rows) {
 *    console.log('hello 1');
 *    return rows;
 *  })
 *  .runAfterKnexQueryPushFront(function (rows) {
 *    console.log('hello 2');
 *    return rows;
 *  });
 *
 * query.then();
 * // --> hello 2
 * // --> hello 1
 * ```
 */
MoronQueryBuilder.prototype.runAfterKnexQueryPushFront = function (runAfterKnexQuery) {
  this._runAfterKnexQuery.unshift(runAfterKnexQuery);
  return this;
};

/**
 * Registers a function to be called after the database rows are converted to MoronModel instances.
 *
 * Multiple functions can be chained like `.then` methods of a promise.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .runAfterModelCreate(function (models) {
 *    return models;
 *  })
 *  .runAfterKnexQuery(function (models) {
 *    models.push(Person.fromJson({firstName: 'Jennifer'}));
 *  });
 *
 * query.then(function (models) {
 *   var jennifer = models[models.length - 1];
 * });
 * ```
 *
 * @param {function} runAfterModelCreate
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.runAfterModelCreate = function (runAfterModelCreate) {
  this._runAfterModelCreate.push(runAfterModelCreate);
  return this;
};

/**
 * Just like `runAfterModelCreate` but pushes the function before any other runAfterModelCreate functions.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .runAfterModelCreate(function (models) {
 *    console.log('hello 1');
 *    return models;
 *  })
 *  .runAfterModelCreatePushFront(function (models) {
 *    console.log('hello 2');
 *    return models;
 *  });
 *
 * query.then();
 * // --> hello 2
 * // --> hello 1
 * ```
 */
MoronQueryBuilder.prototype.runAfterModelCreatePushFront = function (runAfterModelCreate) {
  this._runAfterModelCreate.unshift(runAfterModelCreate);
  return this;
};

/**
 * Registers a function to be called after the query once the builder is executed.
 *
 * Multiple functions can be chained like `.then` methods of a promise.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .runAfter(function (models) {
 *    return models;
 *  })
 *  .runAfter(function (models) {
 *    models.push(Person.fromJson({firstName: 'Jennifer'}));
 *  });
 *
 * query.then(function (models) {
 *   var jennifer = models[models.length - 1];
 * });
 * ```
 *
 * @param {function} runAfter
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.runAfter = function (runAfter) {
  this._runAfter.push(runAfter);
  return this;
};

/**
 * Just like `runAfter` but pushes the function before any other runAfter functions.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .runAfter(function (models) {
 *    console.log('hello 1');
 *    return models;
 *  })
 *  .runAfterPushFront(function (models) {
 *    console.log('hello 2');
 *    return models;
 *  });
 *
 * query.then();
 * // --> hello 2
 * // --> hello 1
 * ```
 */
MoronQueryBuilder.prototype.runAfterPushFront = function (runAfter) {
  this._runAfter.unshift(runAfter);
  return this;
};

/**
 * @ignore
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.findImpl = function (findImpl) {
  this._findImpl = findImpl;
  return this;
};

/**
 * @ignore
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.insertImpl = function (insertImpl) {
  this._insertImpl = insertImpl;
  return this;
};

/**
 * @ignore
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.updateImpl = function (updateImpl) {
  this._updateImpl = updateImpl;
  return this;
};

/**
 * @ignore
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.patchImpl = function (patchImpl) {
  this._patchImpl = patchImpl;
  return this;
};

/**
 * @ignore
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.deleteImpl = function (deleteImpl) {
  this._deleteImpl = deleteImpl;
  return this;
};

/**
 * @ignore
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.relateImpl = function (relateImpl) {
  this._relateImpl = relateImpl;
  return this;
};

/**
 * @ignore
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.unrelateImpl = function (unrelateImpl) {
  this._unrelateImpl = unrelateImpl;
  return this;
};

/**
 * Fetch relations for the result rows.
 *
 * Example:
 *
 * ```js
 * // Fetch `children` relation for each result Person and `pets` and `movies`
 * // relations for all the children.
 * Person
 *   .query()
 *   .eager('children.[pets, movies]')
 *   .then(function (persons) {
 *     console.log(persons[0].children[0].pets[0].name);
 *     console.log(persons[0].children[0].movies[0].id);
 *   });
 * ```
 *
 * See {@link MoronRelationExpression} for more examples and documentation.
 *
 * @param {String|MoronRelationExpression} exp
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.eager = function (exp) {
  this._eagerExpression = _.isFunction(exp) ? exp.call(this) : (exp || null);

  if (_.isString(this._eagerExpression)) {
    this._eagerExpression = MoronRelationExpression.parse(this._eagerExpression);
  }

  if (this._eagerExpression && this._allowedEagerExpression) {
    if (!this._allowedEagerExpression.isSubExpression(this._eagerExpression)) {
      this.reject(new MoronValidationError({eager: 'eager expression not allowed'}));
    }
  }

  return this;
};

/**
 * Sets the allowed eager expression.
 *
 * Any subset of the allowed expression is accepted by `.eager` method. For example setting
 * the allowed expression to `a.b.c` expressions `a`, `a.b` and `a.b.c` are accepted by `.eager`
 * method. Setting any other expression will reject the query and cause the promise error handlers
 * to be called.
 *
 * This method is useful when the eager expression comes from an untrusted source like query
 * parameters of a http request.
 *
 * ```js
 * Person
 *   .query()
 *   .allowEager('[children.pets, movies]')
 *   .eager(req.query.eager)
 *   .then(function () {
 *
 *   });
 * ```
 *
 * @param {String|MoronRelationExpression} exp
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.allowEager = function (exp) {
  this._allowedEagerExpression = _.isFunction(exp) ? exp.call(this) : (exp || null);

  if (_.isString(this._allowedEagerExpression)) {
    this._allowedEagerExpression = MoronRelationExpression.parse(this._allowedEagerExpression);
  }

  if (this._eagerExpression && this._allowedEagerExpression) {
    if (!this._allowedEagerExpression.isSubExpression(this._eagerExpression)) {
      this.reject(new MoronValidationError({eager: 'eager expression not allowed'}));
    }
  }

  return this;
};

/**
 * Calls the given function immediately and passes `this` as an argument.
 *
 * Handy for chaining conditional stuff:
 *
 * ```js
 * Person
 *   .query()
 *   .call(function (builder) {
 *     if (something) {
 *       builder.where('something', someValue);
 *     }
 *   });
 * ```
 *
 * @param {function} func
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.call = function (func) {
  func.call(this, this);
  return this;
};

/**
 * Returns the MoronModel subclass this builder is bound to.
 *
 * @returns {MoronModel}
 */
MoronQueryBuilder.prototype.modelClass = function () {
  return this._modelClass;
};

/**
 * Returns true if none of the methods `insert`, `.update`, `patch`, `delete`, `relate` or `unrelate` has been called.
 *
 * @returns {Boolean}
 */
MoronQueryBuilder.prototype.isFindQuery = function () {
  return _.isEmpty(this._knexCalls.insert) &&
    _.isEmpty(this._knexCalls.update) &&
    _.isEmpty(this._knexCalls.patch) &&
    _.isEmpty(this._knexCalls.delete) &&
    _.isEmpty(this._knexCalls.relate) &&
    _.isEmpty(this._knexCalls.unrelate);
};

/**
 * Returns the SQL string.
 *
 * @returns {String}
 */
MoronQueryBuilder.prototype.toString = function () {
  return this.build().toString();
};

/**
 * Returns the SQL string.
 *
 * @returns {String}
 */
MoronQueryBuilder.prototype.toSql = function () {
  return this.toString();
};

/**
 * Logs the SQL string.
 *
 * Handy for debugging:
 *
 * ```js
 * Person
 *   .query()
 *   .where('firstName', 'Jennifer')
 *   .where('age', 100)
 *   .dumpSql()
 *   .then(function () {
 *     ...
 *   });
 * ```
 *
 * @param {function=} logger
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.dumpSql = function (logger) {
  (logger || console.log)(this.toString());
  return this;
};

/**
 * Create a clone of this builder.
 *
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.clone = function () {
  var clone = new this.constructor(this._modelClass);

  // Simple two-level deep copy.
  clone._knexCalls = _.mapValues(this._knexCalls, function (calls) {
    return _.map(calls, _.identity);
  });

  clone._explicitResolveValue = this._explicitResolveValue;
  clone._explicitRejectValue = this._explicitRejectValue;
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
  clone._allowedEagerExpression = this._allowedEagerExpression;

  return clone;
};

/**
 * @protected
 */
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

/**
 * @protected
 */
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

/**
 * @protected
 */
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

/**
 * @protected
 */
MoronQueryBuilder.prototype.has = function (methodName) {
  return !_.isEmpty(this._knexCalls[methodName]);
};

/**
 * Executes the query and returns a Promise.
 *
 * @param {function=} successHandler
 * @param {function=} errorHandler
 * @returns {Promise}
 */
MoronQueryBuilder.prototype.then = function (/*successHandler, errorHandler*/) {
  var promise = this._execute();
  return promise.then.apply(promise, arguments);
};

/**
 * Executes the query and calls `.map(mapper)` for the returned promise.
 *
 * @param {function} mapper
 * @returns {Promise}
 */
MoronQueryBuilder.prototype.map = function (/*mapper*/) {
  var promise = this._execute();
  return promise.map.apply(promise, arguments);
};

/**
 * Executes the query and calls `.catch(errorHandler)` for the returned promise.
 *
 * @param {function} errorHandler
 * @returns {Promise}
 */
MoronQueryBuilder.prototype.catch = function (/*errorHandler*/) {
  var promise = this._execute();
  return promise.catch.apply(promise, arguments);
};

/**
 * Executes the query and calls `.return(retVal)` for the returned promise.
 *
 * @param {*} retVal
 * @returns {Promise}
 */
MoronQueryBuilder.prototype.return = function (/*retVal*/) {
  var promise = this._execute();
  return promise.return.apply(promise, arguments);
};

/**
 * Executes the query and calls `.bind(context)` for the returned promise.
 *
 * @param {*} context
 * @returns {Promise}
 */
MoronQueryBuilder.prototype.bind = function (/*context*/) {
  var promise = this._execute();
  return promise.bind.apply(promise, arguments);
};

/**
 * Returns the amount of rows the current query would produce.
 *
 * Note that this executes a query (not the one we are building) and returns a Promise. Use it
 * like this:
 *
 * ```js
 * var query = Person
 *   .query()
 *   .where('age', '>', 20);
 *
 * Promise.all([
 *   query.resultSize(),
 *   query.offset(100).limit(50)
 * ]).spread(function (total, models) {
 *   ...
 * });
 * ```
 *
 * @returns {Promise}
 */
MoronQueryBuilder.prototype.resultSize = function () {
  var knex = this._modelClass.knex();

  // orderBy is useless here and it can make things a lot slower (at least with postgresql 9.3).
  // Remove it from the count query.
  var query = this.clone().clear('orderBy').build();

  var rawQuery = knex.raw(query).wrap('(', ') as temp');
  var countQuery = knex.count('* as count').from(rawQuery);

  return countQuery.then(function (result) {
    return result[0] ? result[0].count : 0;
  });
};

/**
 * Executes the query and returns a page of the results along with the total count.
 *
 * ```js
 * Person
 *   .query()
 *   .where('age', '>', 20)
 *   .page(5, 100)
 *   .then(function (result) {
 *     console.log(result.results.length); // --> 100
 *     console.log(result.total); // --> 3341
 *   });
 * ```
 *
 * @param {Number} page
 *    The index of the page to return.
 *
 * @param {Number} pageSize
 *    The page size.
 *
 * @returns {Promise}
 */
MoronQueryBuilder.prototype.page = function (page, pageSize) {
  return this.range(page * pageSize, (page + 1) * pageSize - 1);
};

/**
 * Executes the query and returns a range of the results along with the total count.
 *
 * ```js
 * Person
 *   .query()
 *   .where('age', '>', 20)
 *   .range(0, 100)
 *   .then(function (result) {
 *     console.log(result.results.length); // --> 101
 *     console.log(result.total); // --> 3341
 *   });
 * ```
 *
 * @param {Number} start
 *    The index of the first result (inclusive).
 *
 * @param {Number} end
 *    The index of the last result (inclusive).
 *
 * @returns {Promise}
 */
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

/**
 * @protected
 */
MoronQueryBuilder.prototype.build = function () {
  return this.constructor.build(this.clone());
};

/**
 * @protected
 * @returns {knex.QueryBuilder}
 */
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

  var knexBuilder = builder._modelClass.knexQuery();

  _.each(builder._knexCalls, function (calls, methodName) {
    if (_.isFunction(knexBuilder[methodName])) {
      _.each(calls, function (args) {
        knexBuilder[methodName].apply(knexBuilder, args);
      });
    }
  });

  return knexBuilder;
};

/**
 * @private
 * @returns {Promise}
 */
MoronQueryBuilder.prototype._execute = function () {
  var builder = this.clone();
  var promise = Promise.resolve();
  var knexBuilder = null;

  if (!builder._explicitResolveValue && !builder._explicitRejectValue) {
    knexBuilder = tryBuild(builder);
  }

  _.each(builder._runBefore, function (func) {
    promise = promise.then(function (result) {
      return func.call(builder, result);
    });
  });

  if (builder._explicitRejectValue) {
    promise = promise.then(function () {
      throw builder._explicitRejectValue;
    });
  }

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

/**
 * If the result is an array, plucks a property from each object.
 *
 * ```js
 * Person
 *   .query()
 *   .where('age', '>', 20)
 *   .pluck('firstName')
 *   .then(function (firstNames) {
 *     console.log(typeof firstNames[0]); // --> string
 *   });
 * ```
 *
 * @param {String} propertyName
 *    The name of the property to pluck.
 *
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.pluck = function (propertyName) {
  return this.runAfter(function (result) {
    if (_.isArray(result)) {
      return _.pluck(result, propertyName);
    } else {
      return result;
    }
  });
};

/**
 * If the result is an array, selects the first item.
 *
 * ```js
 * Person
 *   .query()
 *   .first()
 *   .then(function (firstPerson) {
 *     console.log(person.age);
 *   });
 * ```
 *
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.first = function () {
  return this.runAfter(function (result) {
    if (_.isArray(result)) {
      return result[0];
    } else {
      return result;
    }
  });
};

/**
 * TODO
 *
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.insert = queryMethod('insert');

/**
 * TODO
 *
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.update = queryMethod('update');

/**
 * TODO
 *
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.patch = queryMethod('patch');

/**
 * TODO
 *
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.delete = queryMethod('delete');

/**
 * TODO
 *
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.del = queryMethod('delete');

/**
 * TODO
 *
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.relate = queryMethod('relate');

/**
 * TODO
 *
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.unrelate = queryMethod('unrelate');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.select = queryMethod('select');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.columns = queryMethod('columns');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.column = queryMethod('column');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.from = queryMethod('from');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.into = queryMethod('into');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.table = queryMethod('table');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.distinct = queryMethod('distinct');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.join = queryMethod('join');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.innerJoin = queryMethod('innerJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.leftJoin = queryMethod('leftJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.leftOuterJoin = queryMethod('leftOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.rightJoin = queryMethod('rightJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.rightOuterJoin = queryMethod('rightOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.outerJoin = queryMethod('outerJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.fullOuterJoin = queryMethod('fullOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.crossJoin = queryMethod('crossJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.where = queryMethod('where');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.andWhere = queryMethod('andWhere');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orWhere = queryMethod('orWhere');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereRaw = queryMethod('whereRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereWrapped = queryMethod('whereWrapped');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orWhereRaw = queryMethod('orWhereRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereExists = queryMethod('whereExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orWhereExists = queryMethod('orWhereExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereNotExists = queryMethod('whereNotExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orWhereNotExists = queryMethod('orWhereNotExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereIn = queryMethod('whereIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orWhereIn = queryMethod('orWhereIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereNotIn = queryMethod('whereNotIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 */
MoronQueryBuilder.prototype.orWhereNotIn = queryMethod('orWhereNotIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereNull = queryMethod('whereNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orWhereNull = queryMethod('orWhereNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereNotNull = queryMethod('whereNotNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orWhereNotNull = queryMethod('orWhereNotNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereBetween = queryMethod('whereBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.whereNotBetween = queryMethod('whereNotBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orWhereBetween = queryMethod('orWhereBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orWhereNotBetween = queryMethod('orWhereNotBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.groupBy = queryMethod('groupBy');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orderBy = queryMethod('orderBy');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.union = queryMethod('union');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.unionAll = queryMethod('unionAll');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.having = queryMethod('having');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.havingRaw = queryMethod('havingRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orHaving = queryMethod('orHaving');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.orHavingRaw = queryMethod('orHavingRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.offset = queryMethod('offset');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.limit = queryMethod('limit');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.count = queryMethod('count');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.min = queryMethod('min');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.max = queryMethod('max');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.sum = queryMethod('sum');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.avg = queryMethod('avg');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.increment = queryMethod('increment');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.decrement = queryMethod('decrement');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.debug = queryMethod('debug');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.returning = queryMethod('returning');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {MoronQueryBuilder}
 */
MoronQueryBuilder.prototype.truncate = queryMethod('truncate');

/**
 * @returns {Function}
 */
function queryMethod(methodName) {
  /**
   * @returns {MoronQueryBuilder}
   */
  return function () {
    var args = new Array(arguments.length);

    // None of the query builder methods should accept undefined. Do nothing if
    // one of the arguments is undefined. This enables us to do things like
    // `.where('name', req.query.name)` without checking if req.query has the
    // property `name`.
    for (var i = 0, l = arguments.length; i < l; ++i) {
      if (arguments[i] === undefined) {
        return this;
      } else {
        args[i] = arguments[i];
      }
    }

    this._knexCalls[methodName] = this._knexCalls[methodName] || [];
    this._knexCalls[methodName].push(args);

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
  if (!builder._eagerExpression) {
    return models;
  }

  if (models instanceof builder._modelClass || (_.isArray(models) && models[0] instanceof builder._modelClass)) {
    return builder._modelClass.loadRelated(models, builder._eagerExpression);
  } else {
    return models;
  }
}

function tryBuild(builder) {
  try {
    return builder.constructor.build(builder);
  } catch (err) {
    builder.reject(err);
  }
}

module.exports = MoronQueryBuilder;
