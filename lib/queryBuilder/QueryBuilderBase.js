'use strict';

var _ = require('lodash')
  , jsonFieldExpressionParser = require('./parsers/jsonFieldExpressionParser')
  , InsertionOrUpdate = require('./InsertionOrUpdate')
  , utils = require('./../utils');

/**
 * Knex query builder wrapper.
 *
 * This class is a thin wrapper around knex query builder. This class allows us to add our own
 * query builder methods without monkey patching knex query builder.
 *
 * @constructor
 * @ignore
 */
function QueryBuilderBase(knex) {
  this._knex = knex;
  this._knexMethodCalls = [];
}

/**
 * Makes the given constructor a subclass of this class.
 *
 * @param {function=} subclassConstructor
 * @return {function}
 */
QueryBuilderBase.extend = function (subclassConstructor) {
  utils.inherits(subclassConstructor, this);
  return subclassConstructor;
};

/**
 * Calls the given function immediately and passes `this` as an argument.
 *
 * Handy for chaining conditional stuff:
 *
 * ```js
 * new QueryBuilderBase().call(function (builder) {
 *   if (someCondition) {
 *     builder.where('something', someValue);
 *   }
 * });
 * ```
 *
 * @param {function} func
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.call = function (func) {
  func.call(this, this);
  return this;
};

/**
 * Returns the SQL string.
 *
 * @returns {String}
 */
QueryBuilderBase.prototype.toString = function () {
  return this.build().toString();
};

/**
 * Returns the SQL string.
 *
 * @returns {String}
 */
QueryBuilderBase.prototype.toSql = function () {
  return this.toString();
};

/**
 * Create a clone of this builder.
 *
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.clone = function () {
  var clone = new this.constructor(this._knex);
  this.cloneInto(clone);
  return clone;
};

/**
 * @protected
 */
QueryBuilderBase.prototype.cloneInto = function (builder) {
  builder._knex = this._knex;
  builder._knexMethodCalls = this._knexMethodCalls.slice();
};

/**
 * Removes query builder method calls.
 *
 * @param {RegExp=} methodNameRegex
 *    Optional patter to that must match the method names to remove.
 *    If not given, all calls are removed.
 *
 * @ignore
 */
QueryBuilderBase.prototype.clear = function (methodNameRegex) {
  if (methodNameRegex) {
    // Reject all query method calls that don't pass the filter.
    this._knexMethodCalls = _.reject(this._knexMethodCalls, function (call) {
      return methodNameRegex.test(call.method);
    });
  } else {
    // If no arguments are given, clear all query method calls.
    this._knexMethodCalls = [];
  }

  return this;
};

/**
 * Copy query builder method calls from another query builder.
 *
 * @param {QueryBuilderBase} queryBuilder
 *    The builder to copy from.
 *
 * @param {RegExp} methodNameRegex
 *    Optional regular expression to filter which method calls are copied.
 *
 * @ignore
 */
QueryBuilderBase.prototype.copyFrom = function (queryBuilder, methodNameRegex) {
  var self = this;

  _.each(queryBuilder._knexMethodCalls, function (call) {
    if (!methodNameRegex || methodNameRegex.test(call.method)) {
      self._knexMethodCalls.push(call);
    }
  });

  return this;
};

/**
 * Returns true if the builder has a call to a method whose name matches the `methodNameRegex`.
 *
 * @param {RegExp} methodNameRegex
 *
 * @ignore
 */
QueryBuilderBase.prototype.has = function (methodNameRegex) {
  return _.any(this._knexMethodCalls, function (call) {
    return methodNameRegex.test(call.method);
  });
};

/**
 * Builds the query into a knex query builder.
 *
 * @returns {knex.QueryBuilder}
 *    The built knex query builder.
 *
 * @protected
 */
QueryBuilderBase.prototype.build = function () {
  return this.buildInto(this._knex.queryBuilder());
};

/**
 * @private
 */
QueryBuilderBase.prototype.buildInto = function (knexBuilder) {
  _.each(this._knexMethodCalls, function (call) {
    if (_.isFunction(knexBuilder[call.method])) {
      knexBuilder[call.method].apply(knexBuilder, call.args);
    }
  });

  return knexBuilder;
};

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.insert = knexQueryMethod('insert');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.update = knexQueryMethod('update');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.delete = knexQueryMethod('delete');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.del = knexQueryMethod('delete');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.select = knexQueryMethod('select');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.as = knexQueryMethod('as');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.columns = knexQueryMethod('columns');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.column = knexQueryMethod('column');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.from = knexQueryMethod('from');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.fromJS = knexQueryMethod('fromJS');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.into = knexQueryMethod('into');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.withSchema = knexQueryMethod('withSchema');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.table = knexQueryMethod('table');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.distinct = knexQueryMethod('distinct');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.join = knexQueryMethod('join');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.joinRaw = knexQueryMethod('joinRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.innerJoin = knexQueryMethod('innerJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.leftJoin = knexQueryMethod('leftJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.leftOuterJoin = knexQueryMethod('leftOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.rightJoin = knexQueryMethod('rightJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.rightOuterJoin = knexQueryMethod('rightOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.outerJoin = knexQueryMethod('outerJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.fullOuterJoin = knexQueryMethod('fullOuterJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.crossJoin = knexQueryMethod('crossJoin');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.where = knexQueryMethod('where');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.andWhere = knexQueryMethod('andWhere');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhere = knexQueryMethod('orWhere');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereNot = knexQueryMethod('whereNot');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhereNot = knexQueryMethod('orWhereNot');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereRaw = knexQueryMethod('whereRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereWrapped = knexQueryMethod('whereWrapped');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.havingWrapped = knexQueryMethod('havingWrapped');


/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhereRaw = knexQueryMethod('orWhereRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereExists = knexQueryMethod('whereExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhereExists = knexQueryMethod('orWhereExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereNotExists = knexQueryMethod('whereNotExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhereNotExists = knexQueryMethod('orWhereNotExists');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereIn = knexQueryMethod('whereIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhereIn = knexQueryMethod('orWhereIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereNotIn = knexQueryMethod('whereNotIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 */
QueryBuilderBase.prototype.orWhereNotIn = knexQueryMethod('orWhereNotIn');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereNull = knexQueryMethod('whereNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhereNull = knexQueryMethod('orWhereNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereNotNull = knexQueryMethod('whereNotNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhereNotNull = knexQueryMethod('orWhereNotNull');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereBetween = knexQueryMethod('whereBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereNotBetween = knexQueryMethod('whereNotBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhereBetween = knexQueryMethod('orWhereBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orWhereNotBetween = knexQueryMethod('orWhereNotBetween');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.groupBy = knexQueryMethod('groupBy');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.groupByRaw = knexQueryMethod('groupByRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orderBy = knexQueryMethod('orderBy');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orderByRaw = knexQueryMethod('orderByRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.union = knexQueryMethod('union');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.unionAll = knexQueryMethod('unionAll');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.having = knexQueryMethod('having');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.havingRaw = knexQueryMethod('havingRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orHaving = knexQueryMethod('orHaving');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.orHavingRaw = knexQueryMethod('orHavingRaw');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.offset = knexQueryMethod('offset');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.limit = knexQueryMethod('limit');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.count = knexQueryMethod('count');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.countDistinct = knexQueryMethod('countDistinct');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.min = knexQueryMethod('min');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.max = knexQueryMethod('max');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.sum = knexQueryMethod('sum');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.avg = knexQueryMethod('avg');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.avgDistinct = knexQueryMethod('avgDistinct');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.debug = knexQueryMethod('debug');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.returning = knexQueryMethod('returning');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.truncate = knexQueryMethod('truncate');

/**
 * See <a href="http://knexjs.org">knex documentation</a>
 * @method
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.connection = knexQueryMethod('connection');

/**
 * Compares a column reference to another
 *
 * ```js
 * builder.whereRef('Person.id', '=', 'Animal.ownerId');
 * ```
 */
QueryBuilderBase.prototype.whereRef = function (lhs, op, rhs) {
  return this._whereRef('and', lhs, op, rhs);
};

/**
 * Compares a column reference to another
 *
 * ```js
 * builder.orWhereRef('Person.id', '=', 'Animal.ownerId');
 * ```
 */
QueryBuilderBase.prototype.orWhereRef = function (lhs, op, rhs) {
  return this._whereRef('or', lhs, op, rhs);
};

/**
 * Json query APIs
 */

/**
 * @typedef {String} FieldExpression
 *
 * Json field expression to refer to jsonb columns or keys / objects inside columns.
 *
 * e.g. `Person.jsonColumnName:details.names[1]` would refer to column
 * `Person.jsonColumnName` which has `{ details: { names: ['First', 'Second', 'Last'] } }`
 * object stored in it.
 *
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
 *   .then(function (people) {
 *     // oh joy! these people have all their dogs at home!
 *   });
 *
 * Person
 *   .query()
 *   .whereJsonEquals('additionalData:myDogs[0]', { name: "peter"})
 *   .then(function (people) {
 *     // these people's first dog name is "peter" and the dog has no other
 *     // attributes, but its name
 *   });
 * ```
 *
 * @param {FieldExpression} fieldExpression
 *    Reference to column / json field.
 *
 * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
 *    Reference to column / json field or json object.
 *
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereJsonEquals = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "=", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilderBase#whereJsonEquals}
 */
QueryBuilderBase.prototype.orWhereJsonEquals = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "=", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilderBase#whereJsonEquals}
 */
QueryBuilderBase.prototype.whereJsonNotEquals = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "!=", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilderBase#whereJsonEquals}
 */
QueryBuilderBase.prototype.orWhereJsonNotEquals = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "!=", jsonObjectOrFieldExpression);
};

/**
 * Where left hand json field reference is a superset of the right hand json value or reference.
 *
 * ```js
 * Person
 *   .query()
 *   .whereJsonSupersetOf('additionalData:myDogs', 'additionalData:dogsAtHome')
 *   .then(function (people) {
 *     // These people have all or some of their dogs at home. Person might have some
 *     // additional dogs in their custody since myDogs is superset of dogsAtHome.
 *   });
 *
 * Person
 *   .query()
 *   .whereJsonSupersetOf('additionalData:myDogs[0]', { name: "peter"})
 *   .then(function (people) {
 *     // These people's first dog name is "peter", but the dog might have
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
 * The `not` variants with jsonb operators behave in a way that they won't match rows, which don't have
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
 * @param {FieldExpression} fieldExpression
 *    Reference to column / json field, which is tested for being a superset.
 *
 * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
 *    To which to compare.
 *
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereJsonSupersetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilderBase#whereJsonSupersetOf}
 */
QueryBuilderBase.prototype.orWhereJsonSupersetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilderBase#whereJsonSupersetOf}
 */
QueryBuilderBase.prototype.whereJsonNotSupersetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression, 'not');
};

/**
 * @see {@link QueryBuilderBase#whereJsonSupersetOf}
 */
QueryBuilderBase.prototype.orWhereJsonNotSupersetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression, 'not');
};

/**
 * Where left hand json field reference is a subset of the right hand json value or reference.
 *
 * Object and array are always their own subsets.
 *
 * @see {@link QueryBuilderBase#whereJsonSupersetOf}
 *
 * @param {FieldExpression} fieldExpression
 * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereJsonSubsetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilderBase#whereJsonSubsetOf}
 */
QueryBuilderBase.prototype.orWhereJsonSubsetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression);
};

/**
 * @see {@link QueryBuilderBase#whereJsonSubsetOf}
 */
QueryBuilderBase.prototype.whereJsonNotSubsetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression, 'not');
};

/**
 * @see {@link QueryBuilderBase#whereJsonSubsetOf}
 */
QueryBuilderBase.prototype.orWhereJsonNotSubsetOf = function (fieldExpression, jsonObjectOrFieldExpression) {
  return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression, 'not');
};

/**
 * Where json field reference is an array.
 *
 * @param {FieldExpression} fieldExpression
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereJsonIsArray = function (fieldExpression) {
  return this.whereJsonSupersetOf(fieldExpression, []);
};

/**
 * @see {@link QueryBuilderBase#whereJsonIsArray}
 */
QueryBuilderBase.prototype.orWhereJsonIsArray = function (fieldExpression) {
  return this.orWhereJsonSupersetOf(fieldExpression, []);
};

/**
 * @see {@link QueryBuilderBase#whereJsonIsArray}
 * @note Also returns rows where `fieldExpression` does not exist.
 */
QueryBuilderBase.prototype.whereJsonNotArray = function (fieldExpression) {
  var knex = this._knex;
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
 * @see {@link QueryBuilderBase#whereJsonIsArray}
 * @note Also returns rows where `fieldExpression` does not exist.
 */
QueryBuilderBase.prototype.orWhereJsonNotArray = function (fieldExpression) {
  var knex = this._knex;
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
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereJsonIsObject = function (fieldExpression) {
  return this.whereJsonSupersetOf(fieldExpression, {});
};

/**
 * @see {@link QueryBuilderBase#whereJsonIsObject}
 */
QueryBuilderBase.prototype.orWhereJsonIsObject = function (fieldExpression) {
  return this.orWhereJsonSupersetOf(fieldExpression, {});
};

/**
 * @see {@link QueryBuilderBase#whereJsonIsObject}
 * @note Also returns rows where `fieldExpression` does not exist.
 */
QueryBuilderBase.prototype.whereJsonNotObject = function (fieldExpression) {
  var knex = this._knex;
  return this.where(function () {
    // not object
    var builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", {}, 'not');
    var ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
    // or not exist
    builder.orWhereRaw(ifRefNotExistQuery);
  });
};

/**
 * @see {@link QueryBuilderBase#whereJsonIsObject}
 * @note Also returns rows where `fieldExpression` does not exist.
 */
QueryBuilderBase.prototype.orWhereJsonNotObject = function (fieldExpression) {
  var knex = this._knex;
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
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereJsonHasAny = function (fieldExpression, keys) {
  return whereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?|', keys);
};

/**
 * @see {@link QueryBuilderBase#whereJsonHasAny}
 */
QueryBuilderBase.prototype.orWhereJsonHasAny = function (fieldExpression, keys) {
  return orWhereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?|', keys);
};

/**
 * Where all of given strings are found from json object key(s) or array items.
 *
 * @param {FieldExpression} fieldExpression
 * @param {String|Array.<String>} keys Strings that are looked from object or array.
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereJsonHasAll = function (fieldExpression, keys) {
  return whereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?&', keys);
};

/**
 * @see {@link QueryBuilderBase#whereJsonHasAll}
 */
QueryBuilderBase.prototype.orWhereJsonHasAll = function (fieldExpression, keys) {
  return orWhereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?&', keys);
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
 * @returns {QueryBuilderBase}
 */
QueryBuilderBase.prototype.whereJsonField = function (fieldExpression, operator, value) {
  var query = whereJsonFieldQuery(this._knex, fieldExpression, operator, value);
  return this.whereRaw(query);
};

/**
 * @see {@link QueryBuilderBase#whereJsonField}
 */
QueryBuilderBase.prototype.orWhereJsonField = function (fieldExpression, operator, value) {
  var query = whereJsonFieldQuery(this._knex, fieldExpression, operator, value);
  return this.orWhereRaw(query);
};

/**
 * @private
 */
QueryBuilderBase.prototype._whereRef = function (bool, lhs, op, rhs) {
  if (!rhs) {
    rhs = op;
    op = '=';
  }

  var formatter = this._knex.client.formatter();
  op = formatter.operator(op);

  if (!_.isString(lhs) || !_.isString(rhs) || !_.isString(op)) {
    throw new Error('whereRef: invalid operands or operator');
  }

  var sql = formatter.wrap(lhs) + ' ' + op + ' ' + formatter.wrap(rhs);
  if (bool === 'or') {
    return this.orWhereRaw(sql);
  } else {
    return this.whereRaw(sql);
  }
};

/**
 * @returns {Function}
 * @private
 */
function knexQueryMethod(methodName) {
  /**
   * @returns {QueryBuilderBase}
   */
  return function () {
    var args = new Array(arguments.length);
    var knex = this._knex;

    for (var i = 0, l = arguments.length; i < l; ++i) {
      if (arguments[i] === undefined) {
        // None of the query builder methods should accept undefined. Do nothing if
        // one of the arguments is undefined. This enables us to do things like
        // `.where('name', req.query.name)` without checking if req.query has the
        // property `name`.
        return this;
      } else if (arguments[i] instanceof QueryBuilderBase) {
        // Convert QueryBuilderBase instances into knex query builders.
        args[i] = arguments[i].build();
      } else if (_.isFunction(arguments[i])) {
        // If an argument is a function, knex calls it with a query builder as
        // `this` context. We call the function with a QueryBuilderBase as
        // `this` context instead.
        args[i] = wrapFunctionArg(knex, arguments[i]);
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
function wrapFunctionArg(knex, func) {
  return function () {
    var builder = new QueryBuilderBase(knex);
    var knexBuilder = this;

    func.call(builder, builder);
    builder.buildInto(knexBuilder);
  };
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
 * @private
 * @returns {Array} Array of referred path, where first item is table/column.
 */
function parseFieldExpression(expression, extractAsText) {
  var parsed = jsonFieldExpressionParser.parse(expression);
  var jsonRefs = _(parsed.access).pluck('ref').value().join(",");
  var extractor = extractAsText ? '#>>' : '#>';
  // TODO: knex.raw('??', parsed.columnName) could work with latest knex
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
 * @param {QueryBuilderBase} builder
 * @param {FieldExpression} fieldExpression Reference to column / jsonField.
 * @param {String} operator operator to apply.
 * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression Reference to column / jsonField or json object.
 * @param {String=} queryPrefix String prepended to query e.g. 'not'. Space after string added implicitly.
 * @private
 * @returns {QueryBuilderBase}
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
 * @param {QueryBuilderBase} builder
 * @param {FieldExpression} fieldExpression
 * @param {String} operator
 * @param {Array.<String>} keys
 * @returns {QueryBuilderBase}
 */
function whereJsonFieldRightStringArrayOnLeft(builder, fieldExpression, operator, keys) {
  return builder.whereRaw(whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys));
}

/**
 * @private
 * @see {@link whereJsonFieldRightStringArrayOnLeft} for documentation.
 */
function orWhereJsonFieldRightStringArrayOnLeft(builder, fieldExpression, operator, keys) {
  return builder.orWhereRaw(whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys));
}

/**
 * @private
 * @see {@link whereJsonFieldRightStringArrayOnLeft} for documentation.
 */
function whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys) {
  var knex = builder._knex;
  var fieldReference = parseFieldExpression(fieldExpression);
  keys = _.isArray(keys) ? keys : [keys];

  var questionMarksArray = _.map(keys, function (key) {
    if (!_.isString(key)) {
      throw new Error("All keys to find must be strings.");
    }
    return "?";
  });

  var rawSqlTemplateString = "array[" + questionMarksArray.join(",") + "]";
  var rightHandExpression = knex.raw(rawSqlTemplateString, keys);

  return [fieldReference, " ", operator.replace('?', '\\?'), " ", rightHandExpression].join("");
}

/**
 * @private
 * @see {@link QueryBuilderBase#whereJsonField} for documentation.
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

module.exports = QueryBuilderBase;
