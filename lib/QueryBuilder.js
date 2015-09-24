'use strict';

var _ = require('lodash')
  , Promise = require('bluebird')
  , RelationExpression = require('./RelationExpression')
  , jsonFieldExpressionParser = require('./jsonFieldExpressionParser')
  , InsertionOrUpdate = require('./InsertionOrUpdate')
  , ValidationError = require('./ValidationError')
  , utils = require('./utils');

var KNEX_WRITE_METHODS = {
  insert: true,
  update: true,
  delete: true
};

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
 * `bind()` or `return()` is called.
 *
 * @constructor
 */
function QueryBuilder(modelClass) {
  this._modelClass = modelClass;
  this._knexMethodCalls = [];
  this._calledWriteMethod = null;

  this._explicitResolveValue = null;
  this._explicitRejectValue = null;

  this._hooks = null;
  this._customImpl = null;

  this._eagerExpression = null;
  this._allowedEagerExpression = null;

  this.clearHooks();
  this.clearCustomImpl();
}

/**
 * Makes the given constructor a subclass of this class.
 *
 * @param {function=} subclassConstructor
 * @return {function}
 */
QueryBuilder.extend = function (subclassConstructor) {
  utils.inherits(subclassConstructor, this);
  return subclassConstructor;
};

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
 * Registers a function to be called before the database query when the builder is executed.
 *
 * Multiple functions can be chained like `then` methods of a promise.
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
  this._hooks.before.push(runBefore);
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
  this._hooks.before.unshift(runBefore);
  return this;
};

/**
 * Functions registered with this method are called as the last thing before the query is built.
 *
 * Unlike the run* methods these must be synchronous. Also you should not register any run* methods
 * from these. You should _only_ call the query building methods of the builder provided as a parameter.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .onBuild(function (builder) {
 *    builder.where('id', 1);
 *  })
 *  .onBuild(function () {
 *    builder.orWhere('id', 2);
 *  });
 * ```
 *
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.onBuild = function (onBuild) {
  this._hooks.onBuild.push(onBuild);
  return this;
};

/**
 * Registers a function to be called after the database query when the builder is executed.
 *
 * The functions take the knex output as input. Usually this is an array of plain
 * javascript objects: one for each row. Multiple functions can be chained like
 * `then` methods of a promise.
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
  this._hooks.afterKnexQuery.push(runAfterKnexQuery);
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
  this._hooks.afterKnexQuery.unshift(runAfterKnexQuery);
  return this;
};

/**
 * Registers a function to be called after the database rows are converted to Model instances.
 *
 * Multiple functions can be chained like `then` methods of a promise.
 *
 * ```js
 * var query = Person.query();
 *
 * query
 *  .runAfterModelCreate(function (models) {
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
  this._hooks.afterModelCreate.push(runAfterModelCreate);
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
  this._hooks.afterModelCreate.unshift(runAfterModelCreate);
  return this;
};

/**
 * Registers a function to be called when the builder is executed.
 *
 * These functions are executed as the last thing before any promise handlers
 * registered using the `then` method. Multiple functions can be chained like
 * `then` methods of a promise.
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
  this._hooks.after.push(runAfter);
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
  this._hooks.after.unshift(runAfter);
  return this;
};

/**
 * Registers a custom find implementation.
 *
 * The find implementation is executed if none of the `insert`, `update`, `patch`, `relate`
 * etc. functions are called.
 *
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.findImpl = function (findImpl) {
  this._customImpl.find = findImpl || null;
  return this;
};

/**
 * Registers a custom insert implementation.
 *
 * The registered method is called when `insert()` is called for a query builder.
 *
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.insertImpl = function (insertImpl) {
  this._customImpl.insert = insertImpl || null;
  return this;
};

/**
 * Registers a custom update implementation.
 *
 * The registered method is called when `update()` is called for a query builder.
 *
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.updateImpl = function (updateImpl) {
  this._customImpl.update = updateImpl || null;
  return this;
};

/**
 * Registers a custom patch implementation.
 *
 * The registered method is called when `patch()` is called for a query builder.
 *
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.patchImpl = function (patchImpl) {
  this._customImpl.patch = patchImpl || null;
  return this;
};


/**
 * Registers a custom delete implementation.
 *
 * The registered method is called when `delete()` is called for a query builder.
 *
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.deleteImpl = function (deleteImpl) {
  this._customImpl.delete = deleteImpl || null;
  return this;
};

/**
 * Registers a custom relate implementation.
 *
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.relateImpl = function (relateImpl) {
  this._customImpl.relate = relateImpl || null;
  return this;
};

/**
 * Registers a custom unrelate implementation.
 *
 * @ignore
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.unrelateImpl = function (unrelateImpl) {
  this._customImpl.unrelate = unrelateImpl || null;
  return this;
};

/**
 * Fetch relations eagerly for the result rows.
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
  this._eagerExpression = exp || null;

  if (_.isString(this._eagerExpression)) {
    this._eagerExpression = RelationExpression.parse(this._eagerExpression);
  }

  checkEager(this);
  return this;
};

/**
 * Sets the allowed eager expression.
 *
 * Any subset of the allowed expression is accepted by `eager` method. For example setting
 * the allowed expression to `a.b.c` expressions `a`, `a.b` and `a.b.c` are accepted by `eager`
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
  this._allowedEagerExpression = exp || null;

  if (_.isString(this._allowedEagerExpression)) {
    this._allowedEagerExpression = RelationExpression.parse(this._allowedEagerExpression);
  }

  checkEager(this);
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
 *     if (someCondition) {
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
 * Gets the Model subclass this builder is bound to.
 *
 * @param {Model} modelClass
 * @returns {Model|QueryBuilder}
 */
QueryBuilder.prototype.modelClass = function (modelClass) {
  return this._modelClass;
};

/**
 * Returns true if none of the methods `insert`, `.update`, `patch`, `delete`, `relate` or `unrelate` has been called.
 *
 * @returns {Boolean}
 */
QueryBuilder.prototype.isFindQuery = function () {
  return !this._calledWriteMethod && !_.any(this._knexMethodCalls, function (call) {
    return KNEX_WRITE_METHODS[call.method];
  });
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

  clone._knexMethodCalls = this._knexMethodCalls.slice();
  clone._calledWriteMethod = this._calledWriteMethod;

  clone._explicitResolveValue = this._explicitResolveValue;
  clone._explicitRejectValue = this._explicitRejectValue;

  _.each(this._hooks, function (funcs, key) {
    clone._hooks[key] = funcs.slice();
  });

  _.each(this._customImpl, function (impl, key) {
    clone._customImpl[key] = impl;
  });

  clone._eagerExpression = this._eagerExpression;
  clone._allowedEagerExpression = this._allowedEagerExpression;

  return clone;
};

/**
 * Returns a clone that has only the explicit where clauses.
 *
 * Also clears onBuild hooks.
 *
 * @ignore
 */
QueryBuilder.prototype.cloneWhereQuery = function () {
  return this
    .clone()
    .clearCustomImpl()
    .clearHooks()
    .clearEager()
    .clearResolve()
    .clearReject()
    .clear(function (methodName) {
      // Clear all query method calls that don't contain `where`.
      return methodName.toLowerCase().indexOf('where') === -1;
    });
};

/**
 * @ignore
 */
QueryBuilder.prototype.clearCustomImpl = function () {
  this._customImpl = {
    find:  function () {
      // Do nothing.
    },
    insert: function (insert) {
      this.onBuild(function (builder) {
        builder.$$insert(insert);
      });
    },
    update:  function (update) {
      this.onBuild(function (builder) {
        builder.$$update(update);
      });
    },
    patch:  function (patch) {
      this.onBuild(function (builder) {
        builder.$$update(patch);
      });
    },
    delete:  function () {
      this.onBuild(function (builder) {
        builder.$$delete();
      });
    },
    relate: function () {
      // Do nothing.
    },
    unrelate: function () {
      // Do nothing.
    }
  };

  return this;
};

/**
 * @ignore
 */
QueryBuilder.prototype.clearHooks = function () {
  this._hooks = {
    before: [],
    onBuild: [],
    afterKnexQuery: [],
    afterModelCreate: [],
    after: []
  };

  return this;
};

/**
 * @ignore
 */
QueryBuilder.prototype.clearEager = function () {
  this._eagerExpression = null;
  return this;
};

/**
 * @ignore
 */
QueryBuilder.prototype.clearResolve = function () {
  this._explicitResolveValue = null;
  return this;
};

/**
 * @ignore
 */
QueryBuilder.prototype.clearReject = function () {
  this._explicitRejectValue = null;
  return this;
};

/**
 * Removes query builder method calls.
 *
 * @ignore
 */
QueryBuilder.prototype.clear = function () {
  if (arguments.length) {
    var args = _.toArray(arguments);
    var filter;

    if (_.isFunction(args[0])) {
      // If the first argument is a function, assume it is a filter function.
      filter = args[0];
    } else {
      // By default, assume that the arguments is an array of method names to clear.
      filter = function (methodName) {
        return _.contains(args, methodName);
      };
    }

    // Reject all query method calls that don't pass the filter.
    this._knexMethodCalls = _.reject(this._knexMethodCalls, function (call) {
      return filter(call.method);
    });

    // Clear the write method call also if it doesn't pass the filter.
    if (filter(this._calledWriteMethod)) {
      this._calledWriteMethod = null;
    }
  } else {
    // If no arguments are given, clear all query method calls.
    this._knexMethodCalls = [];
    this._calledWriteMethod = null;
  }

  return this;
};

/**
 * @ignore
 */
QueryBuilder.prototype.copyFrom = function (queryBuilder) {
  var self = this;

  _.each(queryBuilder._knexMethodCalls, function (call) {
    self._knexMethodCalls.push(call);
  });

  return this;
};

/**
 * @ignore
 */
QueryBuilder.prototype.has = function (methodName) {
  return this._calledWriteMethod === methodName || !!_.find(this._knexMethodCalls, {method: methodName});
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
 * Executes the query and calls `.return(returnValue)` for the returned promise.
 *
 * @param {*} returnValue
 * @returns {Promise}
 */
QueryBuilder.prototype.return = function (/*returnValue*/) {
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
 * Executes the query and calls `.asCallback(callback)` for the returned promise.
 *
 * @param {function} callback
 * @returns {Promise}
 */
QueryBuilder.prototype.asCallback = function (/*callback*/) {
  var promise = this._execute();
  return promise.asCallback.apply(promise, arguments);
};

/**
 * Executes the query and calls `.nodeify(callback)` for the returned promise.
 *
 * @param {function} callback
 * @returns {Promise}
 */
QueryBuilder.prototype.nodeify = function (/*callback*/) {
  var promise = this._execute();
  return promise.nodeify.apply(promise, arguments);
};

/**
 * Returns the amount of rows the current query would produce without `limit` and `offset` applied.
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
  // Remove it from the count query. We also remove the offset and limit
  var query = this
    .clone()
    .clear('orderBy', 'offset', 'limit')
    .build();

  var rawQuery = knex.raw(query).wrap('(', ') as temp');
  var countQuery = knex.count('* as count').from(rawQuery);

  return countQuery.then(function (result) {
    return result[0] ? result[0].count : 0;
  });
};

/**
 * Only returns the given page of results.
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.page = function (page, pageSize) {
  return this.range(page * pageSize, (page + 1) * pageSize - 1);
};

/**
 * Only returns the given range of results.
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
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.range = function (start, end) {
  var self = this;
  var resultSizePromise;

  return this
    .limit(end - start + 1)
    .offset(start)
    .runBefore(function (result) {
      // Don't return the promise so that it is executed
      // in parallel with the actual query.
      resultSizePromise = self.resultSize();
    })
    .runAfter(function (results) {
      // Now that the actual query is finished, wait until the
      // result size has been calculated.
      return Promise.all([results, resultSizePromise]);
    })
    .runAfter(function (arr) {
      return {
        results: arr[0],
        total: _.parseInt(arr[1])
      };
    });
};

/**
 * Builds the query into a knex query builder.
 *
 * @returns {knex.QueryBuilder}
 *    The built knex query builder.
 */
QueryBuilder.prototype.build = function () {
  var builder = this.clone();

  if (builder.isFindQuery()) {
    // If no write methods have been called at this point this query is a
    // find query and we need to call the custom find implementation.
    builder._customImpl.find.call(builder);
  }

  return build(builder);
};

/**
 * @private
 * @returns {Promise}
 */
QueryBuilder.prototype._execute = function () {
  // Take a clone so that we don't modify this instance during execution.
  // The hooks and onBuild callbacks usually modify the query and we want
  // this builder to be re-executable.
  var builder = this.clone();
  var promise = Promise.resolve();

  if (builder.isFindQuery()) {
    // If no write methods have been called at this point this query is a
    // find query and we need to call the custom find implementation.
    builder._customImpl.find.call(builder);
  }

  _.each(builder._hooks.before, function (func) {
    promise = promise.then(function (result) {
      return func.call(builder, result);
    });
  });

  // Resolve all before hooks before building and executing the query
  // and the rest of the hooks.
  return promise.then(function () {
    var knexBuilder = build(builder);
    var promise;

    if (builder._explicitRejectValue) {
      promise = Promise.reject(builder._explicitRejectValue);
    } else if (builder._explicitResolveValue) {
      promise = Promise.resolve(builder._explicitResolveValue);
    } else {
      // We don't need to execute the knex query builder explicitly. The
      // next call to its `then` method will execute it.
      promise = knexBuilder;
    }

    _.each(builder._hooks.afterKnexQuery, function (func) {
      promise = promise.then(function (result) {
        return func.call(builder, result);
      });
    });

    promise = promise.then(function (result) {
      return createModels(builder, result)
    });

    _.each(builder._hooks.afterModelCreate, function (func) {
      promise = promise.then(function (result) {
        return func.call(builder, result);
      });
    });

    if (builder._eagerExpression) {
      promise = promise.then(function (models) {
        return eagerFetch(builder, models);
      });
    }

    _.each(builder._hooks.after, function (func) {
      promise = promise.then(function (result) {
        return func.call(builder, result);
      });
    });

    return promise;
  });
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
 * The inserted objects are validated against the model's `jsonSchema`. If validation fails
 * the Promise is rejected with a `ValidationError`.
 *
 * NOTE: The return value of the insert query only contains the properties given to the insert
 * method plus the identifier. This is because we don't make an additional fetch query after
 * the insert. Using postgres you can chain `.returning('*')` to the query to get all properties.
 * On other databases you have to make an additional query to achieve the same.
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
 * You can also give raw expressions and subqueries as values like this:
 *
 * ```js
 * Person
 *   .query()
 *   .insert({
 *     age: Person.query().avg('age'),
 *     firstName: Person.raw("'Jenni' || 'fer'")
 *   });
 * ```
 *
 * The batch insert only works on Postgres because Postgres is the only database engine
 * that returns the identifiers of _all_ inserted rows. knex supports batch inserts on
 * other databases also, but you only get the id of the first (or last) inserted object
 * as a result. If you need batch insert on other databases you can use knex directly
 * through `YourModel.knexQuery()`.
 *
 * @method
 * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
 *    Objects to insert.
 *
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.insert = tryCallWriteMethod(function insert(modelsOrObjects) {
  var ModelClass = this._modelClass;

  var insertion = new InsertionOrUpdate(QueryBuilder, ModelClass);
  insertion.setModels(modelsOrObjects);

  this._calledWriteMethod = 'insert';
  this._customImpl.insert.call(this, insertion);

  this.runBefore(function () {
    if (insertion.models().length > 1 && !utils.isPostgres(ModelClass.knex())) {
      throw new Error('batch insert only works with Postgresql');
    }

    // TODO: remove this. We can achieve this using $beforeUpdate.
    _.each(insertion.models(), function (model) {
      var id = ModelClass.generateId();

      if (!_.isNull(id)) {
        model.$id(id);
      }
    });

    if (insertion.models().length === 1) {
      return insertion.model().$beforeInsert();
    } else {
      return Promise.map(insertion.models(), function (model) {
        return model.$beforeInsert();
      });
    }
  });

  this.onBuild(function (builder) {
    if (!builder.has('returning')) {
      // If the user hasn't specified a `returning` clause, we make sure
      // that at least the identifier is returned.
      builder.returning(ModelClass.idColumn);
    }
  });

  this.runAfterModelCreatePushFront(function (ret) {
    // If the user specified a `returning` clause the result may already be
    // an array of objects.
    if (!_.isEmpty(ret) && _.isObject(ret[0])) {
      _.each(insertion.models(), function (model, index) {
        model.$set(ret[index]);

        // The returning clause must contain at least the identifier.
        if (!model.$id()) {
          throw new Error('the identifier column "' + ModelClass.idColumn + '"' +
            ' must be listed in the `returning` clause. (`returning *` is fine also)');
        }
      });
    } else {
      // If the return value is not an array of models, we assume
      // it is an array of identifiers.
      _.each(insertion.models(), function (model, idx) {
        model.$id(ret[idx]);
      });
    }

    return insertion.models();
  });

  this.runAfterModelCreate(function (models) {
    return Promise.map(models, function (model) {
      return model.$afterInsert();
    }).then(function () {
      if (insertion.isArray()) {
        return models;
      } else {
        return models[0] || null;
      }
    });
  });

  return this;
});

/**
 * @private
 */
var knexInsert = knexQueryMethod('insert');

/**
 * @ignore
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.$$insert = function (insertion) {
  var input = insertion;

  if (insertion instanceof InsertionOrUpdate) {
    input = insertion.toKnexInput();
  } else if (_.isArray(insertion)) {
    input = _.map(insertion, function (obj) {
      if (_.isFunction(obj.$toDatabaseJson)) {
        return obj.$toDatabaseJson();
      } else {
        return obj;
      }
    });
  } else if (_.isFunction(insertion.$toDatabaseJson)) {
    input = insertion.$toDatabaseJson();
  }

  return knexInsert.call(this, input);
};

/**
 * Creates an update query.
 *
 * The update object is validated against the model's `jsonSchema`. If validation fails
 * the Promise is rejected with a `ValidationError`.
 *
 * This method is meant for updating _whole_ objects with all required properties. If you
 * want to update a subset of properties use the `patch()` method.
 *
 * NOTE: The return value of the update query only contains the properties given to the update
 * method. This is because we don't make an additional fetch query after the update.
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
 * You can also give raw expressions and subqueries as values like this:
 *
 * ```js
 * Person
 *   .query()
 *   .update({
 *     firstName: Person.raw("'Jenni' || 'fer'"),
 *     lastName: 'Lawrence',
 *     age: Person.query().avg('age')
 *   });
 * ```
 *
 * @param {Model|Object=} modelOrObject
 *    The update object.
 *
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.update = function (modelOrObject) {
  return this.$$updateWithOptions(modelOrObject, 'update', {});
};

/**
 * @private
 */
QueryBuilder.prototype.$$updateWithOptions = tryCallWriteMethod(function $$updateWithOptions(modelOrObject, method, opt) {
  var ModelClass = this._modelClass;

  var update = new InsertionOrUpdate(QueryBuilder, ModelClass);
  update.setModels(modelOrObject, opt);

  this._calledWriteMethod = method;
  this._customImpl[method].call(this, update);

  this.runBefore(function () {
    return update.model().$beforeUpdate(opt);
  });

  this.runAfterModelCreatePushFront(function () {
    return update.model();
  });

  this.runAfterModelCreate(function (model) {
    return Promise.resolve(model.$afterUpdate(opt)).return(model);
  });

  return this;
});

/**
 * @private
 */
var knexUpdate = knexQueryMethod('update');

/**
 * @ignore
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.$$update = function (update) {
  var input = update;

  if (update instanceof InsertionOrUpdate) {
    input = update.toKnexInput();
  } else if (_.isFunction(update.$toDatabaseJson)) {
    input = update.$toDatabaseJson();
  }

  // We never want to update the id column.
  delete input[this._modelClass.idColumn];

  return knexUpdate.call(this, input);
};


/**
 * Creates an patch query.
 *
 * The patch object is validated against the model's `jsonSchema` _but_ the `required` property
 * of the `jsonSchema` is ignored. This way the properties in the patch object are still validated
 * but an error isn't thrown if the patch object doesn't contain all required properties.
 *
 * If validation fails the Promise is rejected with a `ValidationError`.
 *
 * NOTE: The return value of the patch query only contains the properties given to the patch
 * method. This is because we don't make an additional fetch query after the patch.
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
 * You can also give raw expressions and subqueries as values like this:
 *
 * ```js
 * Person
 *   .query()
 *   .patch({
 *     age: Person.query().avg('age'),
 *     firstName: Person.raw("'Jenni' || 'fer'")
 *   });
 * ```
 *
 * @param {Model|Object=} modelOrObject
 *    The update object.
 *
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.patch = function (modelOrObject) {
  return this.$$updateWithOptions(modelOrObject, 'patch', {patch: true});
};

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
QueryBuilder.prototype.delete = tryCallWriteMethod(function del() {
  this._customImpl.delete.call(this);
  this._calledWriteMethod = 'delete';

  this.runAfterModelCreatePushFront(function () {
    return {};
  });

  return this;
});

/**
 * @ignore
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.$$delete = knexQueryMethod('delete');

/**
 * Alias for delete.
 *
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.del = function () {
  return this.delete();
};

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
QueryBuilder.prototype.relate = tryCallWriteMethod(function relate(ids) {
  var inputIsArray = _.isArray(ids);

  if (!inputIsArray){
    ids = [ids];
  }

  this._calledWriteMethod = 'relate';
  var maybeIds = this._customImpl.relate.call(this, ids);

  if (_.isArray(maybeIds)) {
    ids = maybeIds;
  }

  this.runAfterKnexQueryPushFront(function () {
    return ids;
  });

  this.runAfterModelCreate(function (ids) {
    if (inputIsArray) {
      return ids;
    } else {
      return ids[0];
    }
  });

  return this;
});

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
QueryBuilder.prototype.unrelate = tryCallWriteMethod(function unrelate() {
  this._calledWriteMethod = 'unrelate';
  this._customImpl.unrelate.call(this);

  this.runAfterModelCreate(function () {
    return {};
  });

  return this;
});

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.increment = function (propertyName, howMuch) {
  var patch = {};
  var columnName = this._modelClass.propertyNameToColumnName(propertyName);
  patch[propertyName] = this._modelClass.knex().raw('?? + ?', [columnName, howMuch]);
  return this.patch(patch);
};

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.decrement = function (propertyName, howMuch) {
  var patch = {};
  var columnName = this._modelClass.propertyNameToColumnName(propertyName);
  patch[propertyName] = this._modelClass.knex().raw('?? - ?', [columnName, howMuch]);
  return this.patch(patch);
};

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.select = knexQueryMethod('select');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.columns = knexQueryMethod('columns');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.column = knexQueryMethod('column');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.from = knexQueryMethod('from');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.into = knexQueryMethod('into');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.table = knexQueryMethod('table');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.distinct = knexQueryMethod('distinct');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.join = knexQueryMethod('join');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.innerJoin = knexQueryMethod('innerJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.leftJoin = knexQueryMethod('leftJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.leftOuterJoin = knexQueryMethod('leftOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.rightJoin = knexQueryMethod('rightJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.rightOuterJoin = knexQueryMethod('rightOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.outerJoin = knexQueryMethod('outerJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.fullOuterJoin = knexQueryMethod('fullOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.crossJoin = knexQueryMethod('crossJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.where = knexQueryMethod('where');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.andWhere = knexQueryMethod('andWhere');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhere = knexQueryMethod('orWhere');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereRaw = knexQueryMethod('whereRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereWrapped = knexQueryMethod('whereWrapped');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereRaw = knexQueryMethod('orWhereRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereExists = knexQueryMethod('whereExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereExists = knexQueryMethod('orWhereExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNotExists = knexQueryMethod('whereNotExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereNotExists = knexQueryMethod('orWhereNotExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereIn = knexQueryMethod('whereIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereIn = knexQueryMethod('orWhereIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNotIn = knexQueryMethod('whereNotIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 */
QueryBuilder.prototype.orWhereNotIn = knexQueryMethod('orWhereNotIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNull = knexQueryMethod('whereNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereNull = knexQueryMethod('orWhereNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNotNull = knexQueryMethod('whereNotNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereNotNull = knexQueryMethod('orWhereNotNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereBetween = knexQueryMethod('whereBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereNotBetween = knexQueryMethod('whereNotBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereBetween = knexQueryMethod('orWhereBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orWhereNotBetween = knexQueryMethod('orWhereNotBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.groupBy = knexQueryMethod('groupBy');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orderBy = knexQueryMethod('orderBy');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.union = knexQueryMethod('union');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.unionAll = knexQueryMethod('unionAll');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.having = knexQueryMethod('having');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.havingRaw = knexQueryMethod('havingRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orHaving = knexQueryMethod('orHaving');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.orHavingRaw = knexQueryMethod('orHavingRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.offset = knexQueryMethod('offset');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.limit = knexQueryMethod('limit');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.count = knexQueryMethod('count');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.min = knexQueryMethod('min');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.max = knexQueryMethod('max');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.sum = knexQueryMethod('sum');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.avg = knexQueryMethod('avg');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.debug = knexQueryMethod('debug');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.returning = knexQueryMethod('returning');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.truncate = knexQueryMethod('truncate');

/**
 * Compares a column reference to another
 *
 * ```js
 * builder.whereRef('Person.id', '=', 'Animal.ownerId');
 * ```
 */
QueryBuilder.prototype.whereRef = function (lhs, op, rhs) {
  return this._whereRef('and', lhs, op, rhs);
};

/**
 * Compares a column reference to another
 *
 * ```js
 * builder.orWhereRef('Person.id', '=', 'Animal.ownerId');
 * ```
 */
QueryBuilder.prototype.orWhereRef = function (lhs, op, rhs) {
  return this._whereRef('or', lhs, op, rhs);
};

/**
 * Json query APIs
_*/

/**
 * Json field expression to refer to jsonb columns or keys / objects inside columns.
 *
 * e.g. `Person.jsonColumnName:details.names[1]` would refer to column
 * `Person.jsonColumnName` which has `{ details: { names: ['First', 'Second', 'Last'] } }`
 * object stored in it.
 *
 * @typedef {String} FieldExpression
 */

/**
 * Where jsonb field reference equals jsonb object or other field reference.
 *
 * Also supports having field expression in both sides of equality.
 *
 * ```js
 * Person
 *   .query()
 *   .whereJsonEquals('additionalData:myDogs', 'additionalData:dogsAtHome')
 *   .then(function (person) {
 *     // oh joy! these persons have all their dogs at home!
 *   });
 *
 * Person
 *   .query()
 *   .whereJsonEquals('additionalData:myDogs[0]', { name: "peter"})
 *   .then(function (person) {
 *     // these persons' first dog name is "peter" and the dog has no other
 *     // attributes, but its name
 *   });
 * ```
 *
 * @param {FieldExpression} fieldExpression Reference to column / jsonField.
 * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression Reference to column / jsonField or json object.
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonEquals = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "=", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilder#whereJsonEquals}
 */
QueryBuilder.prototype.orWhereJsonEquals = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "=", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilder#whereJsonEquals}
 */
QueryBuilder.prototype.whereJsonNotEquals = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "!=", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilder#whereJsonEquals}
 */
QueryBuilder.prototype.orWhereJsonNotEquals = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "!=", jsonObjectOrFieldExpression);
};

/**
 * Where left hand json field reference is a superset of the right json value or reference.
 *
 * ```js
 * Person
 *   .query()
 *   .whereJsonSupersetOf('additionalData:myDogs', 'additionalData:dogsAtHome')
 *   .then(function (person) {
 *     // These persons have all or some of their dogs at home. Person might have some
 *     // additional dogs in their custody since myDogs is supreset of dogsAtHome.
 *   });
 *
 * Person
 *   .query()
 *   .whereJsonSupersetOf('additionalData:myDogs[0]', { name: "peter"})
 *   .then(function (person) {
 *     // These persons' first dog name is "peter", but the dog might have
 *     // additional attributes as well.
 *   });
 * ```
 *
 * Object and array are always their own supersets.
 *
 * For arrays this means that left side matches if it has all the elements
 * listed in the right hand side. e.g.
 *
 * ```
 * [1,2,3] isSuperSetOf [2] => true
 * [1,2,3] isSuperSetOf [2,1,3] => true
 * [1,2,3] isSuperSetOf [2,null] => false
 * [1,2,3] isSuperSetOf [] => true
 * ```
 *
 * Not variants with jsonb operators behave in a way that they won't match rows, which does not have
 * the referred json key referred in field expression. e.g. for table
 *
 * ```
 *  id |    jsonObject
 * ----+--------------------------
 *   1 | {}
 *   2 | NULL
 *   3 | {"a": 1}
 *   4 | {"a": 1, "b": 2}
 *   5 | {"a": ['3'], "b": ['3']}
 * ```
 *
 * query:
 *
 * ```js
 * builder.whereJsonNotEquals("jsonObject:a", "jsonObject:b")
 * ```
 *
 * Returns only the row `4` which has keys `a` and `b` and `a` != `b`, but it won't return any rows which
 * does not have `jsonObject.a` or `jsonObject.b`.
 *
 * @param {FieldExpression} fieldExpression Reference to column / jsonField, which is tested being superset.
 * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression to which to compare.
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonSupersetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilder#whereJsonSupersetOf}
 */
QueryBuilder.prototype.orWhereJsonSupersetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilder#whereJsonSupersetOf}
 */
QueryBuilder.prototype.whereJsonNotSupersetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression, 'not');
};

/**
 * @see {@link QueryBuilder#whereJsonSupersetOf}
 */
QueryBuilder.prototype.orWhereJsonNotSupersetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression, 'not');
};

/**
 * Where left hand json field reference is a subset of the right json value or reference.
 *
 * Object and array are always their own subsets.
 *
 * @see {@link QueryBuilder#whereJsonSupersetOf}
 *
 * @param {FieldExpression} fieldExpression
 * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonSubsetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilder#whereJsonSubsetOf}
 */
QueryBuilder.prototype.orWhereJsonSubsetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilder#whereJsonSubsetOf}
 */
QueryBuilder.prototype.whereJsonNotSubsetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(
    this, fieldExpression, "<@", jsonObjectOrFieldExpression, 'not');
};

/**
 * @see {@link QueryBuilder#whereJsonSubsetOf}
 */
QueryBuilder.prototype.orWhereJsonNotSubsetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(
    this, fieldExpression, "<@", jsonObjectOrFieldExpression, 'not');
};

/**
 * Where json field reference is an array.
 *
 * @param {FieldExpression} fieldExpression
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonIsArray = function (fieldExpression) {
  return this.whereJsonSupersetOf(fieldExpression, []);
};

/**
 * @see {@link QueryBuilder#whereJsonIsArray}
 */
QueryBuilder.prototype.orWhereJsonIsArray = function (fieldExpression) {
  return this.orWhereJsonSupersetOf(fieldExpression, []);
};

/**
 * @see {@link QueryBuilder#whereJsonIsArray}
 * @note Also returns rows where `fieldExpression` does not exist.
 */
QueryBuilder.prototype.whereJsonNotArray = function (fieldExpression) {
  var knex = this._modelClass.knex();
  // uhh... ugly. own subquery builder could help... now this refers to plain knex subquery builder
  return this.where(function () {
    // not array
    var builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", [], 'not');
    var ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
    // or not exist
    builder.orWhereRaw(ifRefNotExistQuery);
  });
};

/**
 * @see {@link QueryBuilder#whereJsonIsArray}
 * @note Also returns rows where `fieldExpression` does not exist.
 */
QueryBuilder.prototype.orWhereJsonNotArray = function (fieldExpression) {
  var knex = this._modelClass.knex();
  return this.orWhere(function () {
    // not array
    var builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", [], 'not');
    var ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
    // or not exist
    builder.orWhereRaw(ifRefNotExistQuery);
  });
};

/**
 * Where json field reference is an object.
 *
 * @param {FieldExpression} fieldExpression
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonIsObject = function (fieldExpression) {
  return this.whereJsonSupersetOf(fieldExpression, {});
};

/**
 * @see {@link QueryBuilder#whereJsonIsObject}
 */
QueryBuilder.prototype.orWhereJsonIsObject = function (fieldExpression) {
  return this.orWhereJsonSupersetOf(fieldExpression, {});
};

/**
 * @see {@link QueryBuilder#whereJsonIsObject}
 * @note Also returns rows where `fieldExpression` does not exist.
 */
QueryBuilder.prototype.whereJsonNotObject = function (fieldExpression) {
  var knex = this._modelClass.knex();
  return this.where(function () {
    // not object
    var builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", {}, 'not');
    var ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
    // or not exist
    builder.orWhereRaw(ifRefNotExistQuery);
  });
};

/**
 * @see {@link QueryBuilder#whereJsonIsObject}
 * @note Also returns rows where `fieldExpression` does not exist.
 */
QueryBuilder.prototype.orWhereJsonNotObject = function (fieldExpression) {
  var knex = this._modelClass.knex();
  return this.orWhere(function () {
    // not object
    var builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", {}, 'not');
    var ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
    // or not exist
    builder.orWhereRaw(ifRefNotExistQuery);
  });
};

/**
 * Where any of given strings is found from json object key(s) or array items.
 *
 * @param {FieldExpression} fieldExpression
 * @param {String|Array.<String>} keys Strings that are looked from object or array.
 * @returns {QueryBuilder}
 */
/* istanbul ignore next */ // TODO: remove this when tests are enabled and knex bug #519 is fixed
QueryBuilder.prototype.whereJsonHasAny = function (fieldExpression, keys) {
  throw new Error("Disabled because of knex issue #519.");
  // return whereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?|', keys);
};

/**
 * @see {@link QueryBuilder#whereJsonHasAny}
 */
QueryBuilder.prototype.orWhereJsonHasAny = function (fieldExpression, keys) {
  throw new Error("Disabled because of knex issue #519.");
  // return orWhereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?|', keys);
};

/**
 * Where all of given strings are found from json object key(s) or array items.
 *
 * @param {FieldExpression} fieldExpression
 * @param {String|Array.<String>} keys Strings that are looked from object or array.
 * @returns {QueryBuilder}
 */
/* istanbul ignore next */ // TODO: remove this when tests are enabled and knex bug #519 is fixed
QueryBuilder.prototype.whereJsonHasAll = function (fieldExpression, keys) {
  throw new Error("Disabled because of knex issue #519.");
  // return whereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?&', keys);
};

/**
 * @see {@link QueryBuilder#whereJsonHasAll}
 */
QueryBuilder.prototype.orWhereJsonHasAll = function (fieldExpression, keys) {
  throw new Error("Disabled because of knex issue #519.");
  // return orWhereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?&', keys);
};

/**
 * Where referred json field value casted to same type with value fulfill given operand.
 *
 * Value may be number, string, null, boolean and referred json field is converted
 * to TEXT, NUMERIC or BOOLEAN sql type for comparison.
 *
 * If left hand field does not exist rows appear IS null so if one needs to get only
 * rows, which has key and it's value is null one may use e.g.
 * `.whereJsonSupersetOf("column", { field: null })` or check is key exist and
 * then `.whereJsonField('column:field', 'IS', null)`
 *
 * For testing against objects or arrays one should see tested with whereJsonEqual,
 * whereJsonSupersetOf and whereJsonSubsetOf methods.
 *
 * @param {FieldExpression} fieldExpression Expression pointing to certain value.
 * @param {String} operator SQL comparator usually `<`, `>`, `<>`, `=` or `!=`
 * @param {Boolean|Number|String|null} value Value to which field is compared to.
 * @returns {QueryBuilder}
 */
QueryBuilder.prototype.whereJsonField = function (fieldExpression, operator, value) {
  var query = whereJsonFieldQuery(this._modelClass.knex(), fieldExpression, operator, value);
  return this.whereRaw(query);
};

/**
 * @see {@link QueryBuilder#whereJsonField}
 */
QueryBuilder.prototype.orWhereJsonField = function (fieldExpression, operator, value) {
  var query = whereJsonFieldQuery(this._modelClass.knex(), fieldExpression, operator, value);
  return this.orWhereRaw(query);
};

/**
 * @private
 */
QueryBuilder.prototype._whereRef = function (bool, lhs, op, rhs) {
  var func = (bool === 'and') ? this.whereRaw : this.orWhereRaw;
  var formatter = this._modelClass.formatter();

  if (_.isUndefined(rhs)) {
    rhs = op;
    op = '=';
  }

  op = formatter.operator(op);

  if (!_.isString(lhs) || !_.isString(rhs) || !_.isString(op)) {
    throw new Error('whereRef: invalid operands or operator');
  }

  return func.call(this, formatter.wrap(lhs) + ' ' + op + ' ' + formatter.wrap(rhs));
};

/**
 * @private
 */
function tryCallWriteMethod(func) {
  return function () {
    if (this._calledWriteMethod) {
      this.reject(new Error('Double call to a write method. ' +
        'You can only call one of the write methods ' +
        '(insert, update, patch, delete, relate, unrelate, increment, decrement) ' +
        'and only once per query builder.'));
      return this;
    }

    try {
      func.apply(this, arguments);
    } catch (err) {
      this.reject(err);
    }

    return this;
  };
}

/**
 * @private
 */
function checkEager(builder) {
  if (builder._eagerExpression && builder._allowedEagerExpression) {
    if (!builder._allowedEagerExpression.isSubExpression(builder._eagerExpression)) {
      builder.reject(new ValidationError({eager: 'eager expression not allowed'}));
    }
  }
}

/**
 * @returns {Function}
 */
function knexQueryMethod(methodName) {
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
      } else if (arguments[i] instanceof QueryBuilder) {
        // Convert QueryBuilders into knex query builders.
        args[i] = arguments[i].build();
      } else {
        args[i] = arguments[i];
      }
    }

    this._knexMethodCalls.push({
      method: methodName,
      args: args
    });

    return this;
  };
}

/**
 * @private
 */
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

/**
 * @private
 */
function eagerFetch(builder, models) {
  if (models instanceof builder._modelClass || (_.isArray(models) && models[0] instanceof builder._modelClass)) {
    return builder._modelClass.loadRelated(models, builder._eagerExpression);
  } else {
    return models;
  }
}

/**
 * @private
 */
function build(builder) {
  var knexBuilder = builder._modelClass.knexQuery();

  _.each(builder._hooks.onBuild, function (func) {
    func.call(builder, builder);
  });

  _.each(builder._knexMethodCalls, function (call) {
    if (_.isFunction(knexBuilder[call.method])) {
      knexBuilder[call.method].apply(knexBuilder, call.args);
    }
  });

  return knexBuilder;
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
 * @param {String} expression
 * @param {Boolean} extractAsText Return text instead of jsonb object (useful for type casting).
 * @returns {Array} Array of referred path, where first item is table/column.
 */
function parseFieldExpression(expression, extractAsText) {
  var parsed = jsonFieldExpressionParser.parse(expression);
  var jsonRefs = _(parsed.access).pluck('ref').value().join(",");
  var extractor = extractAsText ? '#>>' : '#>';
  // TODO: Checkout if knex has some utility function to add correct kind of quotes to column name
  //       this one is for PostgreSQL
  var middleQuotedColumnName = parsed.columnName.split('.').join('"."');
  return ['"', middleQuotedColumnName, '"', extractor, "'{", jsonRefs, "}'"].join("");
}

/**
 * Where jsonb reference on left hand side is compared to jsonb value or reference on the right hand side.
 *
 * Converts left and right hand values to PostgreSQL acceptable format and add user chosen
 * operator between left and right hand expressions.
 *
 * ```javascript
 * whereJsonbRefOnLeftJsonbValOrRefOnRight(queryBuilder, "ModelJson.jsonObject:objectField", "<@", { key: 1 })
 * ```
 *
 * ```sql
 * select * from "ModelJson" where ("ModelJson"."jsonObject"#>'{objectField}')::jsonb <@ '{\"key\":\ 1}'::jsonb
 * ```
 *
 * @param {QueryBuilder} builder
 * @param {FieldExpression} fieldExpression Reference to column / jsonField.
 * @param {String} operator operator to apply.
 * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression Reference to column / jsonField or json object.
 * @param {String=} queryPrefix String prepended to query e.g. 'not'. Space after string added implicitly.
 * @returns {QueryBuilder}
 */
function whereJsonbRefOnLeftJsonbValOrRefOnRight(builder, fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix) {
  var queryParams = whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix);
  return builder.whereRaw.apply(builder, queryParams);
}

/**
 * @private
 * @see {@link whereJsonbRefOnLeftJsonbValOrRefOnRight} for documentation.
 */
function orWhereJsonbRefOnLeftJsonbValOrRefOnRight(builder, fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix) {
  var queryParams = whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix);
  return builder.orWhereRaw.apply(builder, queryParams);
}

/**
 * @private
 * @see {@link whereJsonbRefOnLeftJsonbValOrRefOnRight} for documentation.
 * @return {Array} Parameters for whereRaw call.
 */
function whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix) {
  var fieldReference = parseFieldExpression(fieldExpression);
  if (_.isString(jsonObjectOrFieldExpression)) {
    var rightHandReference = parseFieldExpression(jsonObjectOrFieldExpression);
    var refRefQuery = ["(", fieldReference, ")::jsonb", operator, "(", rightHandReference, ")::jsonb"];
    if (queryPrefix) {
      refRefQuery.unshift(queryPrefix);
    }
    return [refRefQuery.join(" ")];
  } else if (_.isObject(jsonObjectOrFieldExpression)) {
    var refValQuery = ["(", fieldReference, ")::jsonb", operator, "?::jsonb"];
    if (queryPrefix) {
      refValQuery.unshift(queryPrefix);
    }
    return [refValQuery.join(" "), JSON.stringify(jsonObjectOrFieldExpression)];
  }
  throw new Error("Invalid right hand expression.");
}

/**
 * @private
 * @see {@link whereJsonFieldRightStringArrayOnLeft} for documentation.
 */
/* istanbul ignore next */ // TODO: remove this when tests are enabled and knex bug #519 is fixed
function orWhereJsonFieldRightStringArrayOnLeft(builder, fieldExpression, operator, keys) {
  var query = whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys);
  return builder.orWhereRaw(query);
}

/**
 * Where field expression on left side and string or an array of strings on right hand side.
 *
 * ```javascript
 * whereJsonFieldRightStringArrayOnLeft(queryBuilder, "ModelJson.jsonObject:a", "?&",  ["1","2"])
 * ```
 *
 * ```sql
 * select * from "ModelJson" where "ModelJson"."jsonObject"#>'{a}' ?& array['1','2']
 * ```
 *
 * @param {QueryBuilder} builder
 * @param {FieldExpression} fieldExpression
 * @param {String} operator
 * @param {Array.<String>} keys
 * @returns {QueryBuilder}
 */
/* istanbul ignore next */ // TODO: remove this when tests are enabled and knex bug #519 is fixed
function whereJsonFieldRightStringArrayOnLeft(builder, fieldExpression, operator, keys) {
  var query = whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys);
  return builder.whereRaw(query);
}

/**
 * @private
 * @see {@link whereJsonFieldRightStringArrayOnLeft} for documentation.
 */
/* istanbul ignore next */ // TODO: remove this when tests are enabled and knex bug #519 is fixed
function orWhereJsonFieldRightStringArrayOnLeft(builder, fieldExpression, operator, keys) {
  var query = whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys);
  return builder.orWhereRaw(query);
}

/**
 * @private
 * @see {@link whereJsonFieldRightStringArrayOnLeft} for documentation.
 */
/* istanbul ignore next */ // TODO: remove this when tests are enabled and knex bug #519 is fixed
function whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys) {
  var knex = builder._modelClass.knex();
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

  return [fieldReference, " ", operator, " ", rightHandExpression].join("");
}

/**
 * @private
 * @see {@link QueryBuilder#whereJsonField} for documentation.
 */
function whereJsonFieldQuery(knex, fieldExpression, operator, value) {
  var fieldReference = parseFieldExpression(fieldExpression, true);
  var normalizedOperator = normalizeOperator(knex, operator);

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
  return ["(", fieldReference, ")", cast, " ", normalizedOperator," ", escapedValue].join("")
}

/**
 * @private
 * @param knex
 * @param {String} operator
 * @returns {String}
 */
function normalizeOperator(knex, operator) {
  var trimmedLowerCase = operator.trim().toLowerCase();
  switch (trimmedLowerCase) {
    case "is":
    case "is not":
      return trimmedLowerCase;
    default:
      return knex.client.formatter().operator(operator);
  }
}

module.exports = QueryBuilder;
