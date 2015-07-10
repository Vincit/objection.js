'use strict';

var _ = require('lodash')
  , Promise = require('bluebird')
  , RelationExpression = require('./RelationExpression')
  , ValidationError = require('./ValidationError')
  , utils = require('./utils')
  , jsonFieldExpressionParser = require('./jsonFieldExpressionParser');

/**
 * Query builder for Models.
 *
 * This class is a wrapper around <a href="http://knexjs.org#Builder">knex QueryBuilder</a>.
 * QueryBuilder has all the methods a knex QueryBuilder has and more. While knex
 * QueryBuilder returns plain javascript objects, QueryBuilder returns Model
 * subclass instances.
 *
 * QueryBuilder is thenable, meaning that it can be used like a promise. You can
 * return query builder from a `.then` method of a promise and it gets chained just like
 * a normal promise would.
 *
 * The query is executed when one of its promise methods `then()`, `catch()`, `map()`,
 * `bind()` or `return()` is called. Also calling either of the paging methods `page()`
 * or `range()` will execute the query.
 *
 * @constructor
 */
function QueryBuilder(modelClass) {
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
 * Create QueryBuilder for a Model subclass.
 *
 * @param {Model} modelClass
 *    Model subclass.
 */
QueryBuilder.forClass = function (modelClass) {
  return new this(modelClass);
};

/**
 * Skips the database query and "fakes" its result.
 *
 * @param {Array.<Object>} resolve
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.resolve = function (resolve) {
  this._explicitResolveValue = resolve;
  return this;
};

/**
 * Skips the database query and "fakes" an error result.
 *
 * @param {Error} error
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.reject = function (error) {
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.runBefore = function (runBefore) {
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
QueryBuilder.prototype.runBeforePushFront = function (runBefore) {
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.runAfterKnexQuery = function (runAfterKnexQuery) {
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
QueryBuilder.prototype.runAfterKnexQueryPushFront = function (runAfterKnexQuery) {
  this._runAfterKnexQuery.unshift(runAfterKnexQuery);
  return this;
};

/**
 * Registers a function to be called after the database rows are converted to Model instances.
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.runAfterModelCreate = function (runAfterModelCreate) {
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
QueryBuilder.prototype.runAfterModelCreatePushFront = function (runAfterModelCreate) {
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.runAfter = function (runAfter) {
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
QueryBuilder.prototype.runAfterPushFront = function (runAfter) {
  this._runAfter.unshift(runAfter);
  return this;
};

/**
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.findImpl = function (findImpl) {
  this._findImpl = findImpl;
  return this;
};

/**
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.insertImpl = function (insertImpl) {
  this._insertImpl = insertImpl;
  return this;
};

/**
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.updateImpl = function (updateImpl) {
  this._updateImpl = updateImpl;
  return this;
};

/**
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.patchImpl = function (patchImpl) {
  this._patchImpl = patchImpl;
  return this;
};

/**
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.deleteImpl = function (deleteImpl) {
  this._deleteImpl = deleteImpl;
  return this;
};

/**
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.relateImpl = function (relateImpl) {
  this._relateImpl = relateImpl;
  return this;
};

/**
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.unrelateImpl = function (unrelateImpl) {
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
 * See {@link RelationExpression} for more examples and documentation.
 *
 * @param {String|RelationExpression} exp
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.eager = function (exp) {
  this._eagerExpression = _.isFunction(exp) ? exp.call(this) : (exp || null);

  if (_.isString(this._eagerExpression)) {
    this._eagerExpression = RelationExpression.parse(this._eagerExpression);
  }

  if (this._eagerExpression && this._allowedEagerExpression) {
    if (!this._allowedEagerExpression.isSubExpression(this._eagerExpression)) {
      this.reject(new ValidationError({eager: 'eager expression not allowed'}));
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
 * @param {String|RelationExpression} exp
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.allowEager = function (exp) {
  this._allowedEagerExpression = _.isFunction(exp) ? exp.call(this) : (exp || null);

  if (_.isString(this._allowedEagerExpression)) {
    this._allowedEagerExpression = RelationExpression.parse(this._allowedEagerExpression);
  }

  if (this._eagerExpression && this._allowedEagerExpression) {
    if (!this._allowedEagerExpression.isSubExpression(this._eagerExpression)) {
      this.reject(new ValidationError({eager: 'eager expression not allowed'}));
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.call = function (func) {
  func.call(this, this);
  return this;
};

/**
 * Returns the Model subclass this builder is bound to.
 *
 * @returns {Model}
 */
QueryBuilder.prototype.modelClass = function () {
  return this._modelClass;
};

/**
 * Returns true if none of the methods `insert`, `.update`, `patch`, `delete`, `relate` or `unrelate` has been called.
 *
 * @returns {Boolean}
 */
QueryBuilder.prototype.isFindQuery = function () {
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
QueryBuilder.prototype.toString = function () {
  return this.build().toString();
};

/**
 * Returns the SQL string.
 *
 * @returns {String}
 */
QueryBuilder.prototype.toSql = function () {
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.dumpSql = function (logger) {
  (logger || console.log)(this.toString());
  return this;
};

/**
 * Create a clone of this builder.
 *
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.clone = function () {
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
QueryBuilder.prototype.clearCustomImpl = function () {
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
QueryBuilder.prototype.clearAllBut = function () {
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
QueryBuilder.prototype.clear = function () {
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
QueryBuilder.prototype.has = function (methodName) {
  return !_.isEmpty(this._knexCalls[methodName]);
};

/**
 * Executes the query and returns a Promise.
 *
 * @param {function=} successHandler
 * @param {function=} errorHandler
 * @returns {Promise}
 */
QueryBuilder.prototype.then = function (/*successHandler, errorHandler*/) {
  var promise = this._execute();
  return promise.then.apply(promise, arguments);
};

/**
 * Executes the query and calls `.map(mapper)` for the returned promise.
 *
 * @param {function} mapper
 * @returns {Promise}
 */
QueryBuilder.prototype.map = function (/*mapper*/) {
  var promise = this._execute();
  return promise.map.apply(promise, arguments);
};

/**
 * Executes the query and calls `.catch(errorHandler)` for the returned promise.
 *
 * @param {function} errorHandler
 * @returns {Promise}
 */
QueryBuilder.prototype.catch = function (/*errorHandler*/) {
  var promise = this._execute();
  return promise.catch.apply(promise, arguments);
};

/**
 * Executes the query and calls `.return(retVal)` for the returned promise.
 *
 * @param {*} retVal
 * @returns {Promise}
 */
QueryBuilder.prototype.return = function (/*retVal*/) {
  var promise = this._execute();
  return promise.return.apply(promise, arguments);
};

/**
 * Executes the query and calls `.bind(context)` for the returned promise.
 *
 * @param {*} context
 * @returns {Promise}
 */
QueryBuilder.prototype.bind = function (/*context*/) {
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
QueryBuilder.prototype.resultSize = function () {
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
QueryBuilder.prototype.page = function (page, pageSize) {
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
QueryBuilder.prototype.range = function (start, end) {
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
QueryBuilder.prototype.build = function () {
  return this.constructor.build(this.clone());
};

/**
 * @protected
 * @returns {knex.QueryBuilder}
 */
QueryBuilder.build = function (builder) {
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
QueryBuilder.prototype._execute = function () {
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.pluck = function (propertyName) {
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.first = function () {
  return this.runAfter(function (result) {
    if (_.isArray(result)) {
      return result[0];
    } else {
      return result;
    }
  });
};

/**
 * Creates an insert query.
 *
 * Inserts an object or an array of objects. The array version only works on Postgres because
 * Postgres is the only database engine that returns the identifiers of _all_ inserted rows.
 * knex supports batch inserts on other databases also, but you only get the id of the first
 * (or last) inserted object as a result. If you need batch insert on other databases you
 * can use knex directly through `YourModel.knexQuery()`.
 *
 * The inserted objects are validated against the model's `jsonSchema`. If validation fails
 * the Promise is rejected with a `ValidationError`.
 *
 * Examples:
 *
 * ```js
 * Person
 *   .query()
 *   .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
 *   .then(function (jennifer) {
 *     console.log(jennifer.id);
 *   });
 * ```
 *
 * Batch insert (Only works on Postgres):
 *
 * ```js
 * someMovie
 *   .$relatedQuery('actors')
 *   .insert([
 *     {firstName: 'Jennifer', lastName: 'Lawrence'},
 *     {firstName: 'Bradley', lastName: 'Cooper'}
 *   ])
 *   .then(function (actors) {
 *     console.log(actors[0].firstName);
 *     console.log(actors[1].firstName);
 *   });
 * ```
 *
 * @param {Object|Model|Array.<Object|Model>} objects
 *    Objects to insert.
 *
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.insert = queryMethod('insert');

/**
 * Creates an update query.
 *
 * The update object is validated against the model's `jsonSchema`. If validation fails
 * the Promise is rejected with a `ValidationError`.
 *
 * This method is meant for updating _whole_ objects with all required properties. If you
 * want to update a subset of properties use the `patch()` method.
 *
 * This method is mainly useful when updating a single model.
 *
 * Examples:
 *
 * ```js
 * Person
 *   .query()
 *   .update({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
 *   .where('id', 134)
 *   .then(function (update) {
 *     console.log(update.toJSON());
 *   });
 * ```
 *
 * @param {Object|Model} object
 *    The update object.
 *
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.update = queryMethod('update');

/**
 * Creates an patch query.
 *
 * The patch object is validated against the model's `jsonSchema` _but_ the `required` property
 * of the `jsonSchema` is ignored. This way the properties in the patch object are still validated
 * but an error isn't thrown if the patch object doesn't contain all required properties.
 *
 * If validation fails the Promise is rejected with a `ValidationError`.
 *
 * Examples:
 *
 * ```js
 * Person
 *   .query()
 *   .patch({age: 24})
 *   .where('id', 134)
 *   .then(function (patch) {
 *     console.log(patch.toJSON());
 *   });
 * ```
 *
 * @param {Object} object
 *    The update object.
 *
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.patch = queryMethod('patch');

/**
 * Creates a delete query.
 *
 * Examples:
 *
 * ```js
 * Person
 *   .query()
 *   .delete()
 *   .where('age', '>', 100)
 *   .then(function () {
 *     console.log('removed over 100 year old people');
 *   });
 * ```
 *
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.delete = queryMethod('delete');

/**
 * Alias for delete.
 *
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.del = queryMethod('delete');

/**
 * Relates an existing model to another model.
 *
 * This method doesn't create a new instance but only updates the foreign keys and in
 * the case of ManyToMany relation, creates a join row to the join table.
 *
 * On Postgres multiple models can be related by giving an array of identifiers.
 *
 * ```js
 * Person
 *   .query()
 *   .where('id', 123)
 *   .first()
 *   .then(function (person) {
 *     return person.$relatedQuery('movies').relate(50);
 *   })
 *   .then(function () {
 *     console.log('movie 50 is now related to person 123 through `movies` relation');
 *   });
 * ```
 *
 * @method
 * @param {Number|String|Array.<Number|String>} ids
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.relate = queryMethod('relate');

/**
 * Removes a connection between two models.
 *
 * Doesn't delete the models. Only removes the connection. For ManyToMany relations this
 * deletes the join column from the join table. For other relation types this sets the
 * join columns to null.
 *
 * ```js
 * Person
 *   .query()
 *   .where('id', 123)
 *   .first()
 *   .then(function (person) {
 *     return person.$relatedQuery('movies').unrelate().where('id', 50);
 *   })
 *   .then(function () {
 *     console.log('movie 50 is no longer related to person 123 through `movies` relation');
 *   });
 * ```
 *
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.unrelate = queryMethod('unrelate');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.select = queryMethod('select');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.columns = queryMethod('columns');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.column = queryMethod('column');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.from = queryMethod('from');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.into = queryMethod('into');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.table = queryMethod('table');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.distinct = queryMethod('distinct');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.join = queryMethod('join');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.innerJoin = queryMethod('innerJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.leftJoin = queryMethod('leftJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.leftOuterJoin = queryMethod('leftOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.rightJoin = queryMethod('rightJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.rightOuterJoin = queryMethod('rightOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.outerJoin = queryMethod('outerJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.fullOuterJoin = queryMethod('fullOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.crossJoin = queryMethod('crossJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.where = queryMethod('where');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.andWhere = queryMethod('andWhere');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhere = queryMethod('orWhere');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereRaw = queryMethod('whereRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereWrapped = queryMethod('whereWrapped');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereRaw = queryMethod('orWhereRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereExists = queryMethod('whereExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereExists = queryMethod('orWhereExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNotExists = queryMethod('whereNotExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereNotExists = queryMethod('orWhereNotExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereIn = queryMethod('whereIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereIn = queryMethod('orWhereIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNotIn = queryMethod('whereNotIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 */
QueryBuilder.prototype.orWhereNotIn = queryMethod('orWhereNotIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNull = queryMethod('whereNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereNull = queryMethod('orWhereNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNotNull = queryMethod('whereNotNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereNotNull = queryMethod('orWhereNotNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereBetween = queryMethod('whereBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNotBetween = queryMethod('whereNotBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereBetween = queryMethod('orWhereBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereNotBetween = queryMethod('orWhereNotBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.groupBy = queryMethod('groupBy');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orderBy = queryMethod('orderBy');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.union = queryMethod('union');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.unionAll = queryMethod('unionAll');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.having = queryMethod('having');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.havingRaw = queryMethod('havingRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orHaving = queryMethod('orHaving');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orHavingRaw = queryMethod('orHavingRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.offset = queryMethod('offset');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.limit = queryMethod('limit');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.count = queryMethod('count');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.min = queryMethod('min');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.max = queryMethod('max');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.sum = queryMethod('sum');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.avg = queryMethod('avg');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.increment = queryMethod('increment');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.decrement = queryMethod('decrement');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.debug = queryMethod('debug');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.returning = queryMethod('returning');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.truncate = queryMethod('truncate');

/**
 * Json query APIs
 */

/**
 * Json field filter.
 *
 * Supports having field expression in both sides of operand, but right hand value cannot
 * be any other value, but only string reference to other column/json filed, json array
 * or json object.
 *
 * Converts left and right hand values to PostgreSQL acceptable format and add user chosen
 * operator between left and right hand expressions.
 *
 * @param fieldExpression {String} Reference to column / jsonField.
 * @param jsonObjectOrFieldExpression {Object|Array|String} Reference to column / jsonField or json object.
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonObject = function (fieldExpression, operator, jsonObjectOrFieldExpression) {
  var fieldReference = parseFieldExpression(fieldExpression);
  if (_.isString(jsonObjectOrFieldExpression)) {
    var rightHandReference = parseFieldExpression(jsonObjectOrFieldExpression);
    var refRefQuery = ["(", fieldReference, ")::jsonb ", operator, " (", rightHandReference, ")::jsonb"].join("");
    return this.whereRaw(refRefQuery);
  } else if (_.isObject(jsonObjectOrFieldExpression)) {
    var refValQuery = ["(", fieldReference, ")::jsonb ", operator, " ?::jsonb"].join("");
    return this.whereRaw(refValQuery, JSON.stringify(jsonObjectOrFieldExpression));
  }
  throw new Error("Invalid right hand expression.");
};


/**
 * Json equality comparison.
 *
 * Also supports having field expression in both sides of equality.
 *
 * ```js
 * Person
 *   .query()
 *   .whereJsonEquals('additionalData.myDogs', 'additionalData.dogsAtHome')
 *   .then(function (person) {
 *     // oh joy! these persons has all their dogs at home!
 *   });
 *
 * Person
 *   .query()
 *   .whereJsonEquals('additionalData.myDogs[0]', { name: "peter"})
 *   .then(function (person) {
 *     // these persons' first dog name is "peter" and the dog has no other
 *     // attributes, but its name
 *   });
 * ```
 *
 * @param fieldExpression {String} Reference to column / jsonField.
 * @param jsonObjectOrFieldExpression {Object|Array|String} Reference to column / jsonField or json object.
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonEquals = function (fieldExpression, jsonObjectOrFieldExpression) {
  return this.whereJsonObject(fieldExpression, "=", jsonObjectOrFieldExpression);
};

/**
 * Json filters all results where left hand operator is superset of the right hand operand.
 *
 * ```js
 * Person
 *   .query()
 *   .whereJsonSupersetOf('additionalData.myDogs', 'additionalData.dogsAtHome')
 *   .then(function (person) {
 *     // oh joy! these persons has all their dogs at home!
 *     // But there might be actually some extra dogs there since
 *     // we requested with subset
 *   });
 *
 * Person
 *   .query()
 *   .whereJsonSupersetOf('additionalData.myDogs[0]', { name: "peter"})
 *   .then(function (person) {
 *     // these persons' first dog name is "peter", but the dog might have
 *     // additional attributes as well
 *   });
 * ```
 *
 * Object and array are always their own supersets.
 *
 * For arrays this mean that all arrays of left side matches if it has all the elements
 * listed in the right hand side. e.g.
 *
 * [1,2,3] isSuperSetOf [2] => true
 * [1,2,3] isSuperSetOf [2,1,3] => true
 * [1,2,3] isSuperSetOf [2,null] => false
 * [1,2,3] isSuperSetOf [] => true
 *
 * @param fieldExpression {String} Reference to column / jsonField, which is tested being supoerset.
 * @param jsonObjectOrFieldExpression {Object|Array|String} to which to compare.
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonSupersetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return this.whereJsonObject(fieldExpression, "@>", jsonObjectOrFieldExpression);
};

/**
 * Json filters all results where left hand operator is subset of the right hand operand.
 *
 * Object and array are always their own subsets.
 *
 * see {QueryBuilder.prototype.whereJsonSupersetOf}
 *
 * @param fieldExpression {String}
 * @param jsonObjectOrFieldExpression
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonSubsetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return this.whereJsonObject(fieldExpression, "<@", jsonObjectOrFieldExpression);
};

/**
 * Match field type to be an array.
 *
 * @param fieldExpression {String}
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonIsArray = function (fieldExpression) {
  return this.whereJsonSupersetOf(fieldExpression, []);
};

/**
 * Match field type to be an object.
 *
 * @param fieldExpression {String}
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonIsObject = function (fieldExpression) {
  return this.whereJsonSupersetOf(fieldExpression, {});
};

/**
 * Match if one of given strings is found from json object key(s) or array items.
 *
 * @param fieldExpression {String}
 * @param keys {String|Array.<String>} Strings that are looked from object or array.
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonHasAny = function (fieldExpression, keys) {
  throw new Error("Disabled because of knex issue #519.");
  // return this.whereJsonFieldRightStringArrayOnLeft(fieldExpression, '?|', keys);
};

/**
 * Match if all strings are found from json object key(s) or array items.
 *
 * @param fieldExpression {String}
 * @param keys {String|Array.<String>} Strings that are looked from object or array.
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonHasAll = function (fieldExpression, keys) {
  throw new Error("Disabled because of knex issue #519.");
  // return this.whereJsonFieldRightStringArrayOnLeft(fieldExpression, '?&', keys);
};

/**
 * Helper method for making queries where there is field expression on left side and
 * string or an array of strings on right hand side.
 *
 * @param fieldExpression
 * @param operator
 * @param keys
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonFieldRightStringArrayOnLeft = function (fieldExpression, operator, keys) {
  var knex = this._modelClass.knex();
  var fieldReference = parseFieldExpression(fieldExpression);
  keys = _.isString(keys) ? [keys] : keys;
  var questionMarksArray = _.map(keys, function (key) {
    if (!_.isString(key)) {
      throw new Error("All keys to find must be strings.");
    }
    return "?";
  });
  var rawSqlTemplateString = "array[" + questionMarksArray.join(",") + "]";
  var rightHandExpression = knex.raw(rawSqlTemplateString, keys);
  return this.whereRaw(fieldReference + " "  + operator + " " + rightHandExpression);
};

/**
 * Match if json field value comparison match.
 *
 * Value may be number, string, null, boolean and referred json field is converted
 * to TEXT, NUMERIC or BOOLEAN sql type for comparison.
 *
 * If left hand field does not exist rows appear IS null so if one needs to get only
 * rows, which has key and it's value is null one may use e.g.
 * `.whereJsonSupersetOf("column", { field: null })` or check is key exist and
 * then `.whereJsonField('column.field', 'IS', null)`
 *
 * For testing against objects or arrays one should see tested with whereJsonEqual,
 * whereJsonSupersetOf and whereJsonSubsetOf methods.
 *
 * @param fieldExpression {String} Expression pointing to certain value.
 * @param operator {String} SQL comparator usually `<`, `>`, `<>`, `=` or `!=`
 * @param value {Boolean|Number|String|null} Value to which field is compared to.
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonField = function (fieldExpression, operator, value) {
  var knex = this._modelClass.knex();
  var fieldReference = parseFieldExpression(fieldExpression, true);
  // json type comparison takes json type in string format
  var cast;
  var escapedValue = knex.raw(" ?", [value]);
  if (_.isNumber(value)) {
    cast = "::NUMERIC";
  } else if (_.isBoolean(value)) {
    cast = "::BOOLEAN";
  } else if (_.isString(value)) {
    cast = "::TEXT";
  } else if (_.isNull(value)) {
    cast = "::TEXT";
    escapedValue = 'NULL';
  } else {
    throw new Error("Value must be string, number, boolean or null.");
  }
  return this.whereRaw(["(", fieldReference, ")", cast, " ", operator," ", escapedValue].join(""));
};

/**
 * @returns {Function}
 */
function queryMethod(methodName) {
  /**
   * @returns {QueryBuilder}
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

/**
 * Field expression how to refer certain nested field inside jsonb column.
 *
 * Table.jsonColumn:obj[key.with.dots][0].key.0.me[0] refers to
 * obj = { "key.with.dots" : [{"key" : { "0": { me : [ "I was referred" ] }}}]
 *
 * Since PostgreSql #>{field,0,field2,...} operator does not make difference if
 * reference is string or a number, one can actually use also jsonArray.0 notation
 * to refer index of an array. Like wise one can use object[123] notation to refer
 * key of an object { "123" : null }.
 *
 * @param expression
 * @returns {Array}
 */
function parseFieldExpression(expression, extractAsText) {
  var parsed = jsonFieldExpressionParser.parse(expression);
  var jsonRefs = _(parsed.access).pluck('ref').value().join(",");
  var extractor = extractAsText ? '#>>' : '#>';
  // TODO: Checkout if knex has some utility function to add correct kind of quotes to column name
  //       this one is for PostgreSQL
  var middleQuotetColumnName = parsed.columnName.split('.').join('"."');
  return ['"', middleQuotetColumnName, '"', extractor, "'{", jsonRefs, "}'"].join("");
}

module.exports = QueryBuilder;
