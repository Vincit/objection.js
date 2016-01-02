import _ from 'lodash';
import Promise from 'bluebird';
import RelationExpression from './RelationExpression';
import InsertionOrUpdate from './InsertionOrUpdate';
import InsertWithRelated from './InsertWithRelated';
import QueryBuilderBase from './QueryBuilderBase';
import ValidationError from '../ValidationError';
import EagerFetcher from './EagerFetcher';
import {isPostgres} from '../utils/dbUtils';
import {deprecated} from '../utils/decorators';

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
 * @extends QueryBuilderBase
 */
export default class QueryBuilder extends QueryBuilderBase {

  constructor(modelClass) {
    super(modelClass.knex());

    this._modelClass = modelClass;
    this._calledWriteMethod = null;
    this._explicitRejectValue = null;
    this._explicitResolveValue = null;

    this._hooks = null;
    this._customImpl = null;

    this._eagerExpression = null;
    this._eagerFilters = null;
    this._allowedEagerExpression = null;
    this._allowedInsertExpression = null;

    this.clearHooks();
    this.clearCustomImpl();
  }

  /**
   * Create QueryBuilder for a Model subclass.
   *
   * @param {Model} modelClass
   *    Model subclass.
   */
  static forClass(modelClass) {
    return new this(modelClass);
  }

  /**
   * Sets/gets the query context.
   *
   * Some query builder methods create more than one query. The query context is an object that is
   * shared with all queries started by a query builder. You can set the context like this:
   *
   * ```js
   * Person
   *   .query()
   *   .context({something: 'hello'});
   * ```
   *
   * and access the context like this:
   *
   * ```js
   * var context = builder.context();
   * ```
   *
   * You can set any data to the context object. You can also register QueryBuilder lifecycle methods
   * for _all_ queries that share the context:
   *
   * ```js
   * Person
   *   .query()
   *   .context({
   *     runBefore: function (builder) {},
   *     runAfter: function (builder) {},
   *     onBuild: function (builder) {}
   *   });
   * ```
   *
   * For example the `eager` method causes multiple queries to be executed from a single query builder.
   * If you wanted to make all of them use the same schema you could write this:
   *
   * ```js
   * Person
   *   .query()
   *   .eager('[movies, children.movies])
   *   .context({
   *     onBuild: function (builder) {
   *       builder.withSchema('someSchema');
   *     }
   *   });
   * ```
   *
   * The context is also passed to `$beforeInsert`, `$afterInsert`, `$beforeUpdate` and `$afterUpdate`
   * calls that the query creates.
   *
   * See the methods {@link QueryBuilder#runBefore}, {@link QueryBuilder#onBuild} and
   * {@link QueryBuilder#runAfter} for more information about the hooks.
   *
   * @param {Object=} ctx
   * @returns {QueryBuilder|Object}
   */
  context(...args) {
    // This implementation is here just so that we can document it.
    return super.context(...args);
  }

  /**
   * Should call this for all other queries a QueryBuilder starts with the "parent" query as parameter.
   *
   * For internal use only.
   *
   * @ignore
   * @param {QueryBuilderBase} query
   */
  childQueryOf(query) {
    if (query) {
      this.internalContext(query.internalContext());

      if (query.has(/debug/)) {
        this.debug();
      }
    }
    return this;
  }

  /**
   * Skips the database query and "fakes" an error result.
   *
   * @param {Error} error
   * @returns {QueryBuilder}
   */
  reject(error) {
    this._explicitRejectValue = error;
    return this;
  }

  /**
   * Skips the database query and "fakes" a result.
   *
   * @param {*} value
   * @returns {QueryBuilder}
   */
  resolve(value) {
    this._explicitResolveValue = value;
    return this;
  }

  /**
   * Returns false if this query will never be executed.
   *
   * This may be true in multiple cases:
   *
   * 1. The query is explicitly resolved or rejected using the `resolve` or `reject` methods.
   * 2. The query starts a different query when it is executed.
   *
   * @returns {boolean}
   */
  isExecutable() {
    return !this._explicitRejectValue && !this._explicitResolveValue && !this._hooks.executor;
  }

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
   * @param {function(*, QueryBuilder)} runBefore
   * @returns {QueryBuilder}
   */
  runBefore(runBefore) {
    this._hooks.before.push(runBefore);
    return this;
  }

  /**
   * Just like `runBefore` but pushes the function before any other runBefore functions.
   *
   * ```js
   * var query = Person.query();
   *
   * query
   *  .runBefore(function (result, queryBuilder) {
   *    console.log('hello', result);
   *  })
   *  .runBeforePushFront(function () {
   *    console.log('hello 2');
   *    return 1;
   *  });
   *
   * query.then();
   * // --> hello 2
   * // --> hello 1
   * ```
   *
   * @ignore
   * @param {function(*, QueryBuilder)} runBefore
   * @returns {QueryBuilder}
   */
  runBeforePushFront(runBefore) {
    this._hooks.before.unshift(runBefore);
    return this;
  }

  /**
   * Functions registered with this method are called as the last thing before the query is executed.
   *
   * If you need to modify the SQL query at query build time, this is the place to do it. You shouldn't
   * modify the query in any of the `run*` methods.
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
   * @param {function(QueryBuilder)} onBuild
   * @returns {QueryBuilder}
   */
  onBuild(onBuild) {
    this._hooks.onBuild.push(onBuild);
    return this;
  }

  /**
   * Sets a custom query executor.
   *
   * Setting this will cause the query builder to not be executed. Instead the fully built
   * query builder is passed to the function registered using this method and the function
   * should return some other query to execute.
   *
   * @ignore
   * @param {function(QueryBuilder)} executor
   * @returns {QueryBuilder}
   */
  setQueryExecutor(executor) {
    if (this._hooks.executor) {
      throw Error('overwriting an executor. you should not do this.');
    }

    this._hooks.executor = executor;
    return this;
  }

  /**
   * Registers a function to be called after the database rows are converted to Model instances.
   *
   * Multiple functions can be chained like `then` methods of a promise.
   *
   * ```js
   * var query = Person.query();
   *
   * query
   *  .runAfterModelCreate(function (models, queryBuilder) {
   *    models.push(Person.fromJson({firstName: 'Jennifer'}));
   *  });
   *
   * query.then(function (models) {
   *   var jennifer = models[models.length - 1];
   * });
   * ```
   *
   * @ignore
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfterModelCreate
   * @returns {QueryBuilder}
   */
  runAfterModelCreate(runAfterModelCreate) {
    this._hooks.afterModelCreate.push(runAfterModelCreate);
    return this;
  }

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
   *  .runAfterModelCreatePushFront(function (models, queryBuilder) {
   *    console.log('hello 2');
   *    return models;
   *  });
   *
   * query.then();
   * // --> hello 2
   * // --> hello 1
   * ```
   *
   * @ignore
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfterModelCreate
   * @returns {QueryBuilder}
   */
  runAfterModelCreatePushFront(runAfterModelCreate) {
    this._hooks.afterModelCreate.unshift(runAfterModelCreate);
    return this;
  }

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
   *  .runAfter(function (models, queryBuilder) {
   *    return models;
   *  })
   *  .runAfter(function (models, queryBuilder) {
   *    models.push(Person.fromJson({firstName: 'Jennifer'}));
   *  });
   *
   * query.then(function (models) {
   *   var jennifer = models[models.length - 1];
   * });
   * ```
   *
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfter
   * @returns {QueryBuilder}
   */
  runAfter(runAfter) {
    this._hooks.after.push(runAfter);
    return this;
  }

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
   *  .runAfterPushFront(function (models, queryBuilder) {
   *    console.log('hello 2');
   *    return models;
   *  });
   *
   * query.then();
   * // --> hello 2
   * // --> hello 1
   * ```
   *
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfter
   * @returns {QueryBuilder}
   */
  runAfterPushFront(runAfter) {
    this._hooks.after.unshift(runAfter);
    return this;
  }

  /**
   * Registers a custom find implementation.
   *
   * The find implementation is executed if none of the `insert`, `update`, `patch`, `relate`
   * etc. functions are called.
   *
   * @ignore
   * @returns {QueryBuilder}
   */
  findImpl(findImpl) {
    this._customImpl.find = findImpl || null;
    return this;
  }

  /**
   * Registers a custom insert implementation.
   *
   * The registered method is called when `insert()` is called for a query builder.
   *
   * @ignore
   * @returns {QueryBuilder}
   */
  insertImpl(insertImpl) {
    this._customImpl.insert = insertImpl || null;
    return this;
  }

  /**
   * Registers a custom update implementation.
   *
   * The registered method is called when `update()` is called for a query builder.
   *
   * @ignore
   * @returns {QueryBuilder}
   */
  updateImpl(updateImpl) {
    this._customImpl.update = updateImpl || null;
    return this;
  }

  /**
   * Registers a custom patch implementation.
   *
   * The registered method is called when `patch()` is called for a query builder.
   *
   * @ignore
   * @returns {QueryBuilder}
   */
  patchImpl(patchImpl) {
    this._customImpl.patch = patchImpl || null;
    return this;
  }

  /**
   * Registers a custom delete implementation.
   *
   * The registered method is called when `delete()` is called for a query builder.
   *
   * @ignore
   * @returns {QueryBuilder}
   */
  deleteImpl(deleteImpl) {
    this._customImpl.delete = deleteImpl || null;
    return this;
  }

  /**
   * Registers a custom relate implementation.
   *
   * @ignore
   * @returns {QueryBuilder}
   */
  relateImpl(relateImpl) {
    this._customImpl.relate = relateImpl || null;
    return this;
  }

  /**
   * Registers a custom unrelate implementation.
   *
   * @ignore
   * @returns {QueryBuilder}
   */
  unrelateImpl(unrelateImpl) {
    this._customImpl.unrelate = unrelateImpl || null;
    return this;
  }

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
   * Relations can be filtered by giving named filter functions as arguments
   * to the relations:
   *
   * ```js
   * Person
   *   .query()
   *   .eager('children(orderByAge).[pets(onlyDogs, orderByName), movies]', {
   *     orderByAge: function (builder) {
   *       builder.orderBy('age')
   *     },
   *     orderByName: function (builder) {
   *       builder.orderBy('name');
   *     },
   *     onlyDogs: function (builder) {
   *       builder.where('species', 'dog')
   *     }
   *   })
   *   .then(function (persons) {
   *     console.log(persons[0].children[0].pets[0].name);
   *     console.log(persons[0].children[0].movies[0].id);
   *   });
   * ```
   *
   * The eager queries are optimized to avoid the N + 1 query problem. Consider this query:
   *
   * ```js
   * Person
   *   .query()
   *   .where('id', 1)
   *   .eager('children.children')
   *   .then(function (persons) {
   *     console.log(persons[0].children.length); // --> 10
   *     console.log(persons[0].children[9].children.length); // --> 10
   *   });
   * ```
   *
   * The person has 10 children and they all have 10 children. The query above will
   * return 100 database rows but will generate only three database queries.
   *
   * See {@link RelationExpression} for more examples and documentation.
   *
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
   * Sets the allowed tree of relations to insert using `insertWithRelated` method.
   *
   * If the model tree given to the `insertWithRelated` method isn't a subtree of the
   * given expression, the query is rejected.
   *
   * ```js
   * Person
   *   .query()
   *   .allowInsert('[children.pets, movies]')
   *   .insertWithRelated({
   *     firstName: 'Sylvester',
   *     children: [{
   *       firstName: 'Sage',
   *       pets: [{
   *         name: 'Fluffy'
   *         species: 'dog'
   *       }, {
   *         name: 'Scrappy',
   *         species: 'dog'
   *       }]
   *     }]
   *   })
   *   .then(function () {
   *
   *   });
   * ```
   *
   * See methods `QueryBuilder.eager`, `QueryBuilder.allowEager` and class {@link RelationExpression} for
   * more information on relation expressions.
   *
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
   * Gets the Model subclass this builder is bound to.
   *
   * @returns {Model}
   */
  modelClass() {
    return this._modelClass;
  }

  /**
   * Returns true if none of the methods `insert`, `.update`, `patch`, `delete`, `relate` or `unrelate` has been called.
   *
   * @ignore
   * @returns {boolean}
   */
  isFindQuery() {
    return !this._calledWriteMethod && !this.has(/insert|update|delete/);
  }

  /**
   * Returns the SQL string.
   *
   * @returns {string}
   */
  toString() {
    return this.build().toString();
  }

  /**
   * Returns the SQL string.
   *
   * @returns {string}
   */
  toSql() {
    return this.toString();
  }

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
   * @param {function(string)=} logger
   * @returns {QueryBuilder}
   */
  @deprecated({removedIn: '0.6.0', useInstead: 'debug()'})
  dumpSql(logger) {
    (logger || console.log)(this.toString());
    return this;
  }

  /**
   * Create a clone of this builder.
   *
   * @returns {QueryBuilder}
   */
  clone() {
    var builder = new this.constructor(this._modelClass);
    // This is a QueryBuilderBase method.
    this.cloneInto(builder);

    builder._calledWriteMethod = this._calledWriteMethod;
    builder._explicitRejectValue = this._explicitRejectValue;
    builder._explicitResolveValue = this._explicitResolveValue;

    _.forEach(this._hooks, (funcs, key) => {
      builder._hooks[key] = _.isArray(funcs) ? funcs.slice() : funcs;
    });

    _.forEach(this._customImpl, (impl, key) => {
      builder._customImpl[key] = impl;
    });

    builder._eagerExpression = this._eagerExpression;
    builder._eagerFilters = this._eagerFilters;
    builder._allowedEagerExpression = this._allowedEagerExpression;
    builder._allowedInsertExpression = this._allowedInsertExpression;

    return builder;
  }

  /**
   * @ignore
   * @returns {QueryBuilder}
   */
  clearCustomImpl() {
    this._customImpl = {
      find() {},
      relate() {},
      unrelate() {},
      insert(insert, builder) {
        builder.onBuild(builder => {
          builder.$$insert(insert);
        });
      },
      update(update, builder) {
        builder.onBuild(builder => {
          builder.$$update(update);
        });
      },
      patch(patch, builder) {
        builder.onBuild(builder => {
          builder.$$update(patch);
        });
      },
      delete(builder) {
        builder.onBuild(builder => {
          builder.$$delete();
        });
      }
    };

    return this;
  }

  /**
   * @ignore
   * @returns {QueryBuilder}
   */
  clearHooks() {
    this._hooks = {
      before: [],
      onBuild: [],
      executor: null,
      afterModelCreate: [],
      after: []
    };

    return this;
  }

  /**
   * @ignore
   * @returns {QueryBuilder}
   */
  clearEager() {
    this._eagerExpression = null;
    this._eagerFilters = null;
    return this;
  }

  /**
   * @ignore
   * @returns {QueryBuilder}
   */
  clearReject() {
    this._explicitRejectValue = null;
    return this;
  }

  /**
   * @ignore
   * @returns {QueryBuilder}
   */
  clearResolve() {
    this._explicitResolveValue = null;
    return this;
  }

  /**
   * Removes query builder method calls.
   *
   * @param {RegExp=} regex
   *    Optional patter to that must match the method names to remove.
   *
   * @ignore
   * @returns {QueryBuilder}
   */
  clear(regex) {
    super.clear(regex);

    if (regex) {
      // Clear the write method call also if it doesn't pass the filter.
      if (regex.test(this._calledWriteMethod)) {
        this._calledWriteMethod = null;
      }
    } else {
      this._calledWriteMethod = null;
    }

    return this;
  }

  /**
   * @ignore
   * @param {RegExp} methodNameRegex
   * @returns {boolean}
   */
  has(methodNameRegex) {
    return super.has(methodNameRegex) || methodNameRegex.test(this._calledWriteMethod);
  }

  /**
   * Executes the query and returns a Promise.
   *
   * @param {function=} successHandler
   * @param {function=} errorHandler
   * @returns {Promise}
   */
  then(/*successHandler, errorHandler*/) {
    var promise = this._execute();
    return promise.then.apply(promise, arguments);
  }

  /**
   * Executes the query and calls `.map(mapper)` for the returned promise.
   *
   * @param {function} mapper
   * @returns {Promise}
   */
  map(/*mapper*/) {
    var promise = this._execute();
    return promise.map.apply(promise, arguments);
  }

  /**
   * Executes the query and calls `.catch(errorHandler)` for the returned promise.
   *
   * @param {function} errorHandler
   * @returns {Promise}
   */
  catch(/*errorHandler*/) {
    var promise = this._execute();
    return promise.catch.apply(promise, arguments);
  }

  /**
   * Executes the query and calls `.return(returnValue)` for the returned promise.
   *
   * @param {*} returnValue
   * @returns {Promise}
   */
  return(/*returnValue*/) {
    var promise = this._execute();
    return promise.return.apply(promise, arguments);
  }

  /**
   * Executes the query and calls `.bind(context)` for the returned promise.
   *
   * @param {*} context
   * @returns {Promise}
   */
  bind(/*context*/) {
    var promise = this._execute();
    return promise.bind.apply(promise, arguments);
  }

  /**
   * Executes the query and calls `.asCallback(callback)` for the returned promise.
   *
   * @param {function} callback
   * @returns {Promise}
   */
  asCallback(/*callback*/) {
    var promise = this._execute();
    return promise.asCallback.apply(promise, arguments);
  }

  /**
   * Executes the query and calls `.nodeify(callback)` for the returned promise.
   *
   * @param {function} callback
   * @returns {Promise}
   */
  nodeify(/*callback*/) {
    var promise = this._execute();
    return promise.nodeify.apply(promise, arguments);
  }

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
   * @param {number} page
   *    The index of the page to return.
   *
   * @param {number} pageSize
   *    The page size.
   *
   * @returns {QueryBuilder}
   */
  page(page, pageSize) {
    return this.range(page * pageSize, (page + 1) * pageSize - 1);
  }

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
   * @param {number} start
   *    The index of the first result (inclusive).
   *
   * @param {number} end
   *    The index of the last result (inclusive).
   *
   * @returns {QueryBuilder}
   */
  range(start, end) {
    const self = this;
    let resultSizePromise;

    return this
      .limit(end - start + 1)
      .offset(start)
      .runBefore(() => {
        // Don't return the promise so that it is executed
        // in parallel with the actual query.
        resultSizePromise = self.resultSize();
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
   * Builds the query into a knex query builder.
   *
   * @ignore
   * @returns {knex.QueryBuilder}
   *    The built knex query builder.
   */
  build() {
    let builder = this.clone();

    if (builder.isFindQuery()) {
      // If no write methods have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._customImpl.find.call(builder, builder);
    }

    // We need to build the builder even if the _hooks.executor function
    // has been defined so that the onBuild hooks get called.
    let knexBuilder = build(builder);

    if (_.isFunction(builder._hooks.executor)) {
      // If the query executor is set, we build the builder that it returns.
      return builder._hooks.executor.call(builder, builder).build();
    } else {
      return knexBuilder;
    }
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
    let context = builder.context() || {};
    let promise = Promise.resolve();

    if (builder.isFindQuery()) {
      // If no write methods have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._customImpl.find.call(builder, builder);
    }

    if (_.isFunction(context.runBefore)) {
      promise = promise.then(result => context.runBefore.call(builder, result, builder));
    }

    _.forEach(builder._hooks.before, func => {
      promise = promise.then(result => func.call(builder, result, builder));
    });

    // Resolve all before hooks before building and executing the query
    // and the rest of the hooks.
    return promise.then(() => {
      // We need to build the builder even if the _explicit(Resolve|Reject)Value or _hooks.executor
      // has been defined so that the onBuild hooks get called.
      let knexBuilder = build(builder);
      let promise;

      if (builder._explicitResolveValue) {
        promise = Promise.resolve(builder._explicitResolveValue);
      } else if (builder._explicitRejectValue) {
        promise = Promise.reject(builder._explicitRejectValue);
      } else if (_.isFunction(builder._hooks.executor)) {
        promise = builder._hooks.executor.call(builder, builder);
      } else {
        promise = knexBuilder.then(result => createModels(builder, result));
      }

      _.forEach(builder._hooks.afterModelCreate, func => {
        promise = promise.then(result => func.call(builder, result, builder));
      });

      if (builder._eagerExpression) {
        promise = promise.then(models => eagerFetch(builder, models));
      }

      if (_.isFunction(context.runAfter)) {
        promise = promise.then(result => context.runAfter.call(builder, result, builder));
      }

      _.forEach(builder._hooks.after, func => {
        promise = promise.then(result => func.call(builder, result, builder));
      });

      return promise;
    });
  }

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
   * @param {string} propertyName
   *    The name of the property to pluck.
   *
   * @returns {QueryBuilder}
   */
  pluck(propertyName) {
    return this.runAfter(result => {
      if (_.isArray(result)) {
        return _.pluck(result, propertyName);
      } else {
        return result;
      }
    });
  }

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
   * Traverses through all models in the result, including the eagerly loaded relations.
   *
   * The optional first parameter can be a constructor. If given, the traverser
   * function is only called for the models of that class.
   *
   * ```js
   * Person
   *   .query()
   *   .eager('pets')
   *   .traverse(function (model, parentModel, relationName) {
   *     delete model.id;
   *   })
   *   .then(function (persons) {
   *     console.log(persons[0].id); // --> undefined
   *     console.log(persons[0].pets[0].id); // --> undefined
   *   });
   * ```
   *
   * ```js
   * Person
   *   .query()
   *   .eager('pets')
   *   .traverse(Animal, function (animal, parentModel, relationName) {
   *     delete animal.id;
   *   })
   *   .then(function (persons) {
   *     console.log(persons[0].id); // --> 1
   *     console.log(persons[0].pets[0].id); // --> undefined
   *   });
   * ```
   *
   * @param {Model|function} modelClass
   *    The optional model class filter. If given, the traverser function is only
   *    called for models of this class.
   *
   * @param {function(Model, Model, string)} traverser
   *    The traverser function that is called for each model. The first argument
   *    is the model itself. If the model is in a relation of some other model
   *    the second argument is the parent model and the third argument is the
   *    name of the relation.
   *
   * @returns {QueryBuilder}
   */
  traverse(modelClass, traverser) {
    var self = this;

    if (_.isUndefined(traverser)) {
      traverser = modelClass;
      modelClass = null;
    }

    return this.runAfter(result => {
      self._modelClass.traverse(modelClass, result, traverser);
      return result;
    });
  }

  /**
   * Pick properties from result models.
   *
   * There are two ways to call this methods:
   *
   * ```js
   * Person
   *   .query()
   *   .eager('pets').
   *   .pick(['id', 'name']);
   * ```
   *
   * and
   *
   * ```js
   * Person
   *   .query()
   *   .eager('pets')
   *   .pick(Person, ['id', 'firstName'])
   *   .pick(Animal, ['id', 'name']);
   * ```
   *
   * The first one goes through all models (including relations) and discards all
   * properties by `id` and `name`. The second one also traverses the whole model
   * tree and discards all but `id` and `firstName` properties of all `Person`
   * instances and `id` and `name` properties of all `Animal` instances.
   *
   * @param {Model=} modelClass
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
   * Omit properties of result models.
   *
   * There are two ways to call this methods:
   *
   * ```js
   * Person
   *   .query()
   *   .eager('pets').
   *   .omit(['parentId', 'ownerId']);
   * ```
   *
   * and
   *
   * ```js
   * Person
   *   .query()
   *   .eager('pets')
   *   .omit(Person, ['parentId', 'age'])
   *   .omit(Animal, ['ownerId', 'species']);
   * ```
   *
   * The first one goes through all models (including relations) and omits the properties
   * `parentId` and `ownerId`. The second one also traverses the whole model tree and
   * omits the properties `parentId` and `age` from all `Person` instances and `ownerId`
   * and `species` properties of all `Animal` instances.
   *
   * @param {Model=} modelClass
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
   * Shortcut for finding a model by id.
   *
   * ```js
   * Person.query().findById(1);
   * ```
   *
   * Composite key:
   *
   * ```js
   * Person.query().findById([1, '10']);
   * ```
   *
   * @param {*|Array.<*>} id
   * @returns {QueryBuilder}
   */
  findById(id) {
    return this.whereComposite(this._modelClass.getFullIdColumn(), id).first();
  }

  /**
   * Creates an insert query.
   *
   * The inserted objects are validated against the model's `jsonSchema`. If validation fails
   * the Promise is rejected with a `ValidationError`.
   *
   * NOTE: The return value of the insert query _only_ contains the properties given to the insert
   * method plus the identifier. This is because we don't make an additional fetch query after
   * the insert. Using postgres you can chain `.returning('*')` to the query to get all properties.
   * On other databases you can use the `insertAndFetch` method.
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
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   *    Objects to insert.
   *
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  insert(modelsOrObjects) {
    const ModelClass = this._modelClass;

    let insertion = new InsertionOrUpdate({
      ModelClass,
      modelsOrObjects
    });

    this.$$callWriteMethodImpl('insert', [insertion, this]);

    this.runBefore((result, builder) => {
      if (insertion.models().length > 1 && !isPostgres(ModelClass.knex())) {
        throw new Error('batch insert only works with Postgresql');
      } else {
        return Promise.map(insertion.models(), model => model.$beforeInsert(builder.context()));
      }
    });

    this.onBuild(builder => {
      if (!builder.has(/returning/)) {
        // If the user hasn't specified a `returning` clause, we make sure
        // that at least the identifier is returned.
        builder.returning(ModelClass.idColumn);
      }
    });

    this.runAfterModelCreatePushFront(ret => {
      if (!_.isArray(ret) || _.isEmpty(ret)) {
        // Early exit if there is nothing to do.
        return insertion.models();
      }

      // If the user specified a `returning` clause the result may already bean array of objects.
      if (_.all(ret, _.isObject)) {
        _.forEach(insertion.models(), (model, index) => {
          model.$set(ret[index]);
        });
      } else {
        // If the return value is not an array of objects, we assume it is an array of identifiers.
        _.forEach(insertion.models(), (model, idx) => {
          // Don't set the id if the model already has one. MySQL and Sqlite don't return the correct
          // primary key value if the id is not generated in db, but given explicitly.
          if (!model.$id()) {
            model.$id(ret[idx]);
          }
        });
      }

      return insertion.models();
    });

    this.runAfterModelCreate((models, builder) => {
      return Promise.map(models, model => {
        return model.$afterInsert(builder.context());
      }).then(() => {
        if (insertion.isArray()) {
          return models;
        } else {
          return models[0] || null;
        }
      });
    });

    return this;
  }

  /**
   * Just like `insert` but also fetches the model afterwards.
   *
   * Note that on postgresql you can just chain `.returning('*')` to the normal insert method
   * to get the same result without an additional query.
   *
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   *    Objects to insert.
   *
   * @returns {QueryBuilder}
   */
  insertAndFetch(modelsOrObjects) {
    const ModelClass = this._modelClass;

    return this.insert(modelsOrObjects).runAfterModelCreate((insertedModels, builder) => {
      let insertedModelArray = _.isArray(insertedModels) ? insertedModels : [insertedModels];

      return ModelClass
        .query()
        .childQueryOf(builder)
        .whereInComposite(ModelClass.getFullIdColumn(), _.map(insertedModelArray, model => model.$id()))
        .then(fetchedModels => {
          fetchedModels = _.indexBy(fetchedModels, (model) => model.$id());

          // Instead of returning the freshly fetched models, update the input
          // models with the fresh values.
          _.forEach(insertedModelArray, insertedModel => {
            insertedModel.$set(fetchedModels[insertedModel.$id()]);
          });

          return insertedModels;
        });
    });
  }

  /**
   * Insert models with relations.
   *
   * You can insert any asyclic graph of models like this:
   *
   * ```js
   * Person
   *   .query()
   *   .insertWithRelated({
   *     firstName: 'Sylvester',
   *     lastName: 'Stallone',
   *
   *     children: [{
   *       firstName: 'Sage',
   *       lastName: 'Stallone',
   *
   *       pets: [{
   *         name: 'Fluffy',
   *         species: 'dog'
   *       }]
   *     }]
   *   });
   * ```
   *
   * The query above will insert 'Sylvester', 'Sage' and 'Fluffy' into db and create
   * relationships between them as defined in the `relationMappings` of the models.
   *
   * If you need to refer to the same model in multiple places you can use the
   * special properties `#id` and `#ref` like this:
   *
   * ```js
   * Person
   *   .query()
   *   .insertWithRelated([{
   *     firstName: 'Jennifer',
   *     lastName: 'Lawrence',
   *
   *     movies: [{
   *       "#id": 'Silver Linings Playbook'
   *       name: 'Silver Linings Playbook',
   *       duration: 122
   *     }]
   *   }, {
   *     firstName: 'Bradley',
   *     lastName: 'Cooper',
   *
   *     movies: [{
   *       "#ref": 'Silver Linings Playbook'
   *     }]
   *   }]);
   * ```
   *
   * The query above will insert only one movie (the 'Silver Linings Playbook') but
   * both 'Jennifer' and 'Bradley' will have the movie related to them through the
   * many-to-many relation `movies`.
   *
   * You can refer to the properties of other models in the graph using expressions
   * of format `#ref{<id>.<property>}` for example:
   *
   * ```js
   * Person
   *   .query()
   *   .insertWithRelated([{
   *     "#id": 'jenniLaw',
   *     firstName: 'Jennifer',
   *     lastName: 'Lawrence',
   *
   *     pets: [{
   *       name: "I am the dog of #ref{jenniLaw.firstName} #ref{jenniLaw.lastName}",
   *       species: 'dog'
   *     }]
   *   }]);
   * ```
   *
   * The query above will insert a pet named `I am the dog of Jennifer Lawrence` for Jennifer.
   *
   * See the `allowInsert` method if you need to limit which relations can be inserted using
   * this method to avoid security issues.
   *
   * By the way, if you are using Postgres the inserts are done in batches for
   * maximum performance.
   *
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   *    Objects to insert.
   *
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  insertWithRelated(modelsOrObjects) {
    const ModelClass = this._modelClass;
    const batchSize = isPostgres(ModelClass.knex()) ? 100 : 1;

    let insertion = new InsertionOrUpdate({
      ModelClass,
      modelsOrObjects,
      // We need to skip validation at this point because the models may contain
      // references and special properties. We validate the models upon insertion.
      modelOptions: {skipValidation: true}
    });

    this.$$callWriteMethodImpl('insert', [insertion, this]);

    // We resolve this query here and will not execute it. This is because the root
    // value may depend on other models in the graph and cannot be inserted first.
    this.resolve([]);

    this.runAfterModelCreatePushFront((result, builder) => {
      let inserter = new InsertWithRelated({
        modelClass: ModelClass,
        models: insertion.models(),
        allowedRelations: builder._allowedInsertExpression || null
      });

      return inserter.execute(tableInsertion => {
        let insertQuery = tableInsertion.modelClass.query().childQueryOf(builder);

        // We skipped the validation above. We need to validate here since at this point
        // the models should no longer contain any special properties.
        _.forEach(tableInsertion.models, model => {
          model.$validate();
        });

        let inputs = _.filter(tableInsertion.models, (model, idx) => {
          return tableInsertion.isInputModel[idx];
        });

        let others = _.filter(tableInsertion.models, (model, idx) => {
          return !tableInsertion.isInputModel[idx];
        });

        return Promise.all(_.flatten([
          batchInsert(inputs, insertQuery.clone().copyFrom(builder, /returning/), batchSize),
          batchInsert(others, insertQuery.clone(), batchSize)
        ]));
      });
    });

    this.runAfterModelCreate(models => {
      if (insertion.isArray()) {
        return models
      } else {
        return _.first(models) || null;
      }
    });
  }

  /**
   * @ignore
   * @returns {QueryBuilder}
   */
  $$insert(insertion) {
    let input = insertion;

    if (insertion instanceof InsertionOrUpdate) {
      input = insertion.toKnexInput();
    } else if (_.isArray(insertion)) {
      input = _.map(insertion, obj => {
        if (_.isFunction(obj.$toDatabaseJson)) {
          return obj.$toDatabaseJson();
        } else {
          return obj;
        }
      });
    } else if (_.isFunction(insertion.$toDatabaseJson)) {
      input = insertion.$toDatabaseJson();
    }

    return super.insert(input);
  }

  /**
   * Creates an update query.
   *
   * The update object is validated against the model's `jsonSchema`. If validation fails
   * the Promise is rejected with a `ValidationError`.
   *
   * This method is meant for updating _whole_ objects with all required properties. If you
   * want to update a subset of properties use the `patch()` method.
   *
   * NOTE: The return value of the query will be the number of affected rows. If you want
   * the updated row as a result, you may want to use the `updateAndFetchById` method.
   *
   * Examples:
   *
   * ```js
   * Person
   *   .query()
   *   .update({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
   *   .where('id', 134)
   *   .then(function (numberOfAffectedRows) {
   *     console.log(numberOfAffectedRows);
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
   * @returns {QueryBuilder}
   */
  update(modelOrObject) {
    return this.$$updateWithOptions(modelOrObject, 'update', {});
  }

  /**
   * Updates a single model by id and fetches it from the database afterwards.
   *
   * The update object is validated against the model's `jsonSchema`. If validation fails
   * the Promise is rejected with a `ValidationError`.
   *
   * This method is meant for updating _whole_ objects with all required properties. If you
   * want to update a subset of properties use the `patchAndFetchById()` method.
   *
   * Examples:
   *
   * ```js
   * Person
   *   .query()
   *   .updateAndFetchById(134, {firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
   *   .then(function (updatedModel) {
   *     console.log(updatedModel.firstName);
   *   });
   * ```
   *
   * You can also give raw expressions and subqueries as values like this:
   *
   * ```js
   * Person
   *   .query()
   *   .updateAndFetchById(134, {
   *     firstName: Person.raw("'Jenni' || 'fer'"),
   *     lastName: 'Lawrence',
   *     age: Person.query().avg('age')
   *   });
   * ```
   *
   * @param {number|string|Array.<number|string>} id
   *    The identifier of the object to update.
   *
   * @param {Model|Object=} modelOrObject
   *    The update object.
   *
   * @returns {QueryBuilder}
   */
  updateAndFetchById(id, modelOrObject) {
    return this
      .$$updateWithOptions(modelOrObject, 'update', {}, id)
      .whereComposite(this._modelClass.getFullIdColumn(), id);
  }

  /**
   * @private
   */
  @writeQueryMethod
  $$updateWithOptions(modelOrObject, method, modelOptions, fetchId) {
    const ModelClass = this._modelClass;

    let update = new InsertionOrUpdate({
      ModelClass,
      modelOptions,
      modelsOrObjects: modelOrObject
    });

    this.$$callWriteMethodImpl(method, [update, this]);

    this.runBefore((result, builder) => {
      return update.model().$beforeUpdate(modelOptions, builder.context());
    });

    this.runAfterModelCreate((numUpdated, builder) => {
      let promise;

      if (fetchId) {
        promise = ModelClass
          .query()
          .first()
          .childQueryOf(builder)
          .whereComposite(ModelClass.getFullIdColumn(), fetchId)
          .then(model => model ? update.model().$set(model) : null);
      } else {
        promise = Promise.resolve(numUpdated);
      }

      return promise.then(result => {
        return [result, update.model().$afterUpdate(modelOptions, builder.context())];
      }).spread(function (result) {
        return result;
      });
    });

    return this;
  }

  /**
   * @ignore
   * @returns {QueryBuilder}
   */
  $$update(update) {
    let input = update;
    let idColumn = this._modelClass.idColumn;

    if (update instanceof InsertionOrUpdate) {
      input = update.toKnexInput();
    } else if (_.isFunction(update.$toDatabaseJson)) {
      input = update.$toDatabaseJson();
    }

    // We never want to update the identifier.
    if (_.isArray(idColumn)) {
      _.each(idColumn, col => {
        delete input[col]
      });
    } else {
      delete input[idColumn];
    }

    return super.update(input);
  }

  /**
   * Creates an patch query.
   *
   * The patch object is validated against the model's `jsonSchema` _but_ the `required` property
   * of the `jsonSchema` is ignored. This way the properties in the patch object are still validated
   * but an error isn't thrown if the patch object doesn't contain all required properties.
   *
   * If validation fails the Promise is rejected with a `ValidationError`.
   *
   * NOTE: The return value of the query will be the number of affected rows. If you want
   * the updated row as a result, you may want to use the `patchAndFetchById` method.
   *
   * Examples:
   *
   * ```js
   * Person
   *   .query()
   *   .patch({age: 24})
   *   .where('id', 134)
   *   .then(function (numberOfAffectedRows) {
   *     console.log(numberOfAffectedRows);
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
   *    The patch object.
   *
   * @returns {QueryBuilder}
   */
  patch(modelOrObject) {
    return this.$$updateWithOptions(modelOrObject, 'patch', {patch: true});
  }

  /**
   * Patches a single model by id and fetches it from the database afterwards.
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
   *   .patchAndFetchById(134, {age: 24})
   *   .then(function (updatedModel) {
   *     console.log(updatedModel.firstName);
   *   });
   * ```
   *
   * You can also give raw expressions and subqueries as values like this:
   *
   * ```js
   * Person
   *   .query()
   *   .patchAndFetchById(134, {
   *     age: Person.query().avg('age'),
   *     firstName: Person.raw("'Jenni' || 'fer'")
   *   });
   * ```
   *
   * @param {number|string|Array.<number|string>} id
   *    The identifier of the object to update.
   *
   * @param {Model|Object=} modelOrObject
   *    The update object.
   *
   * @returns {QueryBuilder}
   */
  patchAndFetchById(id, modelOrObject) {
    return this
      .$$updateWithOptions(modelOrObject, 'patch', {patch: true}, id)
      .whereComposite(this._modelClass.getFullIdColumn(), id);
  }

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
   *   .then(function (numberOfDeletedRows) {
   *     console.log('removed', numberOfDeletedRows, 'people');
   *   });
   * ```
   *
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  delete() {
    this.$$callWriteMethodImpl('delete', [this]);
    return this;
  }

  /**
   * Alias for delete.
   *
   * @returns {QueryBuilder}
   */
  del() {
    return this.delete();
  }

  /**
   * Delete a model by id.
   *
   * ```js
   * Person.query().deleteById(1);
   * ```
   *
   * Composite key:
   *
   * ```js
   * Person.query().deleteById([1, '2', 10]);
   * ```
   *
   * @param {*|Array.<*>} id
   * @returns {QueryBuilder}
   */
  deleteById(id) {
    return this.delete().whereComposite(this._modelClass.getFullIdColumn(), id);
  }

  /**
   * @ignore
   * @returns {QueryBuilder}
   */
  $$delete() {
    return super.delete();
  }

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
   * Composite key:
   *
   * ```js
   * Person
   *   .query()
   *   .where('id', 123)
   *   .first()
   *   .then(function (person) {
   *     return person.$relatedQuery('movies').relate([50, 20, 10]);
   *   })
   *   .then(function () {
   *     console.log('movie 50 is now related to person 123 through `movies` relation');
   *   });
   * ```
   *
   * Multiple models with composite key (postgres only):
   *
   * ```js
   * Person
   *   .query()
   *   .where('id', 123)
   *   .first()
   *   .then(function (person) {
   *     return person.$relatedQuery('movies').relate([[50, 20, 10], [24, 46, 12]]);
   *   })
   *   .then(function () {
   *     console.log('movie 50 is now related to person 123 through `movies` relation');
   *   });
   * ```
   *
   * @param {number|string|Array.<number|string>|Array.<Array.<number|string>>} ids
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  relate(ids) {
    this.$$callWriteMethodImpl('relate', [ids, this]);
    return this.runAfterModelCreate(() => ids);
  }

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
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  unrelate() {
    this.$$callWriteMethodImpl('unrelate', [this]);
    this.runAfterModelCreate(() => { return {}; });
    return this;
  }

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilder}
   */
  increment(propertyName, howMuch) {
    let patch = {};
    let columnName = this._modelClass.propertyNameToColumnName(propertyName);
    patch[propertyName] = this._modelClass.knex().raw('?? + ?', [columnName, howMuch]);
    return this.patch(patch);
  }

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilder}
   */
  decrement(propertyName, howMuch) {
    let patch = {};
    let columnName = this._modelClass.propertyNameToColumnName(propertyName);
    patch[propertyName] = this._modelClass.knex().raw('?? - ?', [columnName, howMuch]);
    return this.patch(patch);
  }

  /**
   * @private
   */
  $$callWriteMethodImpl(method, args) {
    this._calledWriteMethod = 'method';
    return this._customImpl[method].apply(this, args);
  }
}

/**
 * @private
 */
function writeQueryMethod(target, property, descriptor) {
  descriptor.value = tryCallWriteMethod(descriptor.value);
}

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
 * @private
 */
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

/**
 * @private
 */
function eagerFetch(builder, $models) {
  if ($models instanceof builder._modelClass || (_.isArray($models) && $models[0] instanceof builder._modelClass)) {
    return new EagerFetcher({
      modelClass: builder._modelClass,
      models: builder._modelClass.ensureModelArray($models),
      eager: builder._eagerExpression,
      filters: builder._eagerFilters,
      rootQuery: builder
    }).fetch().then(function (models) {
      return _.isArray($models) ? models : models[0];
    });
  } else {
    return $models;
  }
}

/**
 * @private
 */
function build(builder) {
  var context = builder.context() || {};

  if (!builder.has(/from|table|into/)) {
    // Set the table only if it hasn't been explicitly set yet.
    builder.table(builder._modelClass.tableName);
  }

  if (_.isFunction(context.onBuild)) {
    context.onBuild.call(builder, builder);
  }

  _.forEach(builder._hooks.onBuild, function (func) {
    func.call(builder, builder);
  });

  // noinspection JSUnresolvedVariable
  return QueryBuilderBase.prototype.build.call(builder);
}

/**
 * @private
 */
function batchInsert(models, queryBuilder, batchSize) {
  let batches = _.chunk(models, batchSize);
  return _.map(batches, batch => queryBuilder.clone().insert(batch));
}