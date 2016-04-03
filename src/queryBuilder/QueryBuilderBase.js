import _ from 'lodash';
import jsonFieldExpressionParser from './parsers/jsonFieldExpressionParser';
import {inherits} from '../utils/classUtils';
import {isKnexQueryBuilder,  overwriteForDatabase} from '../utils/dbUtils';

/**
 * This class is a thin wrapper around knex query builder. This class allows us to add our own
 * query builder methods without monkey patching knex query builder.
 */
@overwriteForDatabase()
export default class QueryBuilderBase {

  constructor(knex) {
    this._knex = knex;
    this._knexMethodCalls = [];
    this._context = {
      userContext: {}
    };
  }

  /**
   * @param {function=} subclassConstructor
   * @return {Constructor.<QueryBuilderBase>}
   */
  static extend(subclassConstructor) {
    inherits(subclassConstructor, this);
    return subclassConstructor;
  }

  /**
   * Sets/gets the query context.
   */
  context() {
    if (arguments.length === 0) {
      return this._context.userContext;
    } else {
      this._context.userContext = arguments[0];
      return this;
    }
  }

  /**
   * Sets/gets the query's internal context.
   */
  internalContext() {
    if (arguments.length === 0) {
      return this._context;
    } else {
      this._context = arguments[0];
      return this;
    }
  }

  /**
   * @returns {knex}
   */
  knex() {
    return this._knex;
  }

  /**
   * @param {function} func
   * @returns {QueryBuilderBase}
   */
  call(func) {
    func.call(this, this);
    return this;
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
   * @returns {QueryBuilderBase}
   */
  clone() {
    var clone = new this.constructor(this._knex);
    this.cloneInto(clone);
    return clone;
  }

  /**
   * @protected
   */
  cloneInto(builder) {
    builder._knex = this._knex;
    builder._knexMethodCalls = this._knexMethodCalls.slice();
    builder._context = _.clone(this._context);
  }

  /**
   * @param {RegExp=} methodNameRegex
   */
  clear(methodNameRegex) {
    if (methodNameRegex) {
      // Reject all query method calls that don't pass the filter.
      this._knexMethodCalls = _.reject(this._knexMethodCalls, call => methodNameRegex.test(call.method));
    } else {
      // If no arguments are given, clear all query method calls.
      this._knexMethodCalls = [];
    }

    return this;
  }

  /**
   * @param {QueryBuilderBase} queryBuilder
   * @param {RegExp} methodNameRegex
   */
  copyFrom(queryBuilder, methodNameRegex) {
    var self = this;

    _.forEach(queryBuilder._knexMethodCalls, call => {
      if (!methodNameRegex || methodNameRegex.test(call.method)) {
        self._knexMethodCalls.push(call);
      }
    });

    return this;
  }

  /**
   * @param {RegExp} methodNameRegex
   * @returns {boolean}
   */
  has(methodNameRegex) {
    return _.any(this._knexMethodCalls, call => {
      return methodNameRegex.test(call.method);
    });
  }

  /**
   * @protected
   * @returns {knex.QueryBuilder}
   */
  build() {
    return this.buildInto(this._knex.queryBuilder());
  }

  /**
   * @private
   */
  buildInto(knexBuilder) {
    _.forEach(this._knexMethodCalls, call => {
      if (_.isFunction(knexBuilder[call.method])) {
        knexBuilder[call.method].apply(knexBuilder, call.args);
      }
    });

    return knexBuilder;
  }

  /**
   * @private
   */
  callKnexMethod(methodName, args) {
    for (let i = 0, l = args.length; i < l; ++i) {
      if (_.isUndefined(args[i])) {
        // None of the query builder methods should accept undefined. Do nothing if
        // one of the arguments is undefined. This enables us to do things like
        // `.where('name', req.query.name)` without checking if req.query has the
        // property `name`.
        return this;
      } else if (args[i] instanceof QueryBuilderBase) {
        // Convert QueryBuilderBase instances into knex query builders.
        args[i] = args[i].build();
      } else if (_.isFunction(args[i])) {
        // If an argument is a function, knex calls it with a query builder as
        // `this` context. We call the function with a QueryBuilderBase as
        // `this` context instead.
        args[i] = wrapFunctionArg(args[i], this);
      }
    }

    this._knexMethodCalls.push({
      method: methodName,
      args: args
    });

    return this;
  }

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  insert(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  update(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  delete(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod('delete')
  del(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  select(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  forUpdate(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  forShare(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  as(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  columns(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  column(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  from(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  fromJS(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  into(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  withSchema(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  table(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  distinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  join(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  joinRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  innerJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  leftJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  leftOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  rightJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  rightOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  outerJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  fullOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  crossJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  where(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  andWhere(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhere(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNot(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNot(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereWrapped(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  havingWrapped(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNotExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNotExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNotIn(...args) {}

  /**
   */
  @knexQueryMethod()
  orWhereNotIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNotNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNotNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNotBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNotBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  groupBy(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  groupByRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orderBy(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orderByRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  union(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  unionAll(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  having(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  havingRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orHaving(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orHavingRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  offset(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  limit(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  count(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  countDistinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  min(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  max(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  sum(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  avg(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  avgDistinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  debug(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  returning(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  truncate(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  connection(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereRef(lhs, op, rhs) {
    return this._whereRef('and', lhs, op, rhs);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereRef(lhs, op, rhs) {
    return this._whereRef('or', lhs, op, rhs);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  whereComposite(cols, op, values) {
    if (_.isUndefined(values)) {
      values = op;
      op = '=';
    }

    let colsIsArray = _.isArray(cols);
    let valuesIsArray = _.isArray(values);

    if (!colsIsArray && !valuesIsArray) {
      return this.where(cols, op, values);
    } else if (colsIsArray && cols.length === 1 && !valuesIsArray) {
      return this.where(cols[0], op, values);
    } else if (colsIsArray && valuesIsArray && cols.length === values.length) {
      _.each(cols, (col, idx) => this.where(col, op, values[idx]));
      return this;
    } else {
      throw new Error('both cols and values must have same dimensions');
    }
  }

  /**
   * @returns {QueryBuilderBase}
   */
  @overwriteForDatabase({
    sqlite3: 'whereInComposite_sqlite3'
  })
  whereInComposite(columns, values) {
    let isCompositeKey = _.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      if (_.isArray(values)) {
        return this.whereIn(columns, values);
      } else {
        // Because of a bug in knex, we need to build the where-in query from pieces
        // if the value is a subquery.
        let formatter = this._knex.client.formatter();
        let sql = '(' + _.map(columns, col => formatter.wrap(col)).join() + ')';
        return this.whereIn(this._knex.raw(sql), values);
      }
    } else {
      let col = _.isString(columns) ? columns : columns[0];

      if (_.isArray(values)) {
        values = _.compact(_.flatten(values));
      }

      // For non-composite keys we can use the normal whereIn.
      return this.whereIn(col, values);
    }
  }

  /**
   * @private
   */
  whereInComposite_sqlite3(columns, values) {
    let isCompositeKey = _.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      if (!_.isArray(values)) {
        // If the `values` is not an array of values but a function or a subquery
        // we have no way to implement this method.
        throw new Error('sqlite doesn\'t support multi-column where in clauses');
      }

      // Sqlite doesn't support the `where in` syntax for multiple columns but
      // we can emulate it using grouped `or` clauses.
      return this.where(builder => {
        _.each(values, (val) => {
          builder.orWhere(builder => {
            _.each(columns, (col, idx) => {
              builder.andWhere(col, val[idx]);
            });
          });
        });
      });
    } else {
      let col = _.isString(columns) ? columns : columns[0];

      if (_.isArray(values)) {
        values = _.compact(_.flatten(values));
      }

      // For non-composite keys we can use the normal whereIn.
      return this.whereIn(col, values);
    }
  }

  /**
   * Json query APIs
   */

   /**
    * @typedef {String} FieldExpression
    *
    * Field expressions allow one to refer to separate JSONB fields inside columns.
    *
    * Syntax: <column reference>[:<json field reference>]
    *
    * e.g. `Person.jsonColumnName:details.names[1]` would refer to value `'Second'`
    * in column `Person.jsonColumnName` which has
    * `{ details: { names: ['First', 'Second', 'Last'] } }` object stored in it.
    *
    * First part `<column reference>` is compatible with column references used in
    * knex e.g. `MyFancyTable.tributeToThBestColumnNameEver`.
    *
    * Second part describes a path to an attribute inside the referred column.
    * It is optional and it always starts with colon which follows directly with
    * first path element. e.g. `Table.jsonObjectColumnName:jsonFieldName` or
    * `Table.jsonArrayColumn:[321]`.
    *
    * Syntax supports `[<key or index>]` and `.<key or index>` flavors of reference
    * to json keys / array indexes:
    *
    * e.g. both `Table.myColumn:[1][3]` and `Table.myColumn:1.3` would access correctly
    * both of the following objects `[null, [null,null,null, "I was accessed"]]` and
    * `{ "1": { "3" : "I was accessed" } }`
    *
    * Caveats when using special characters in keys:
    *
    * 1. `objectColumn.key` This is the most common syntax, good if you are
    *    not using dots or square brackets `[]` in your json object key name.
    * 2. Keys containing dots `objectColumn:[keywith.dots]` Column `{ "keywith.dots" : "I was referred" }`
    * 3. Keys containing square brackets `column['[]']` `{ "[]" : "This is getting ridiculous..." }`
    * 4. Keys containing square brackets and quotes
    *    `objectColumn:['Double."Quote".[]']` and `objectColumn:["Sinlge.'Quote'.[]"]`
    *    Column `{ "Double.\"Quote\".[]" : "I was referred",  "Sinlge.'Quote'.[]" : "Mee too!" }`
    * 99. Keys containing dots, square brackets, single quotes and double quotes in one json key is
    *     not currently supported
    */

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "=", jsonObjectOrFieldExpression);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "=", jsonObjectOrFieldExpression);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  whereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "!=", jsonObjectOrFieldExpression);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "!=", jsonObjectOrFieldExpression);
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  whereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression, 'not');
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression, 'not');
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  whereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression, 'not');
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression, 'not');
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonIsArray(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, []);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonIsArray(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, []);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  whereJsonNotArray(fieldExpression) {
    let knex = this._knex;
    // uhh... ugly. own subquery builder could help... now this refers to plain knex subquery builder
    return this.where(function () {
      // not array
      let builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", [], 'not');
      let ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
      // or not exist
      builder.orWhereRaw(ifRefNotExistQuery);
    });
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonNotArray(fieldExpression) {
    let knex = this._knex;
    return this.orWhere(function () {
      // not array
      let builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", [], 'not');
      let ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
      // or not exist
      builder.orWhereRaw(ifRefNotExistQuery);
    });
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonIsObject(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, {});
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonIsObject(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, {});
  }

  /**
   * @returns {QueryBuilderBase}
   */
  whereJsonNotObject(fieldExpression) {
    let knex = this._knex;
    return this.where(function () {
      // not object
      let builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", {}, 'not');
      let ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
      // or not exist
      builder.orWhereRaw(ifRefNotExistQuery);
    });
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonNotObject(fieldExpression) {
    let knex = this._knex;
    return this.orWhere(function () {
      // not object
      let builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", {}, 'not');
      let ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
      // or not exist
      builder.orWhereRaw(ifRefNotExistQuery);
    });
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  whereJsonHasAny(fieldExpression, keys) {
    return whereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?|', keys);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonHasAny(fieldExpression, keys) {
    return orWhereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?|', keys);
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  whereJsonHasAll(fieldExpression, keys) {
    return whereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?&', keys);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonHasAll(fieldExpression, keys) {
    return orWhereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?&', keys);
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string} operator
   * @param {boolean|Number|string|null} value
   * @returns {QueryBuilderBase}
   */
  whereJsonField(fieldExpression, operator, value) {
    let query = whereJsonFieldQuery(this._knex, fieldExpression, operator, value);
    return this.whereRaw(query);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereJsonField(fieldExpression, operator, value) {
    let query = whereJsonFieldQuery(this._knex, fieldExpression, operator, value);
    return this.orWhereRaw(query);
  }

  /**
   * @private
   */
  _whereRef(bool, lhs, op, rhs) {
    if (!rhs) {
      rhs = op;
      op = '=';
    }

    let formatter = this._knex.client.formatter();
    op = formatter.operator(op);

    if (!_.isString(lhs) || !_.isString(rhs) || !_.isString(op)) {
      throw new Error('whereRef: invalid operands or operator');
    }

    let sql = formatter.wrap(lhs) + ' ' + op + ' ' + formatter.wrap(rhs);
    if (bool === 'or') {
      return this.orWhereRaw(sql);
    } else {
      return this.whereRaw(sql);
    }
  }
}

function knexQueryMethod(overrideMethodName) {
  return function (target, methodName, descriptor) {
    descriptor.value = function () {
      return this.callKnexMethod(overrideMethodName || methodName, _.toArray(arguments));
    };
  };
}

function wrapFunctionArg(func, query) {
  return function () {
    if (isKnexQueryBuilder(this)) {
      let builder = new QueryBuilderBase(query._knex);
      func.call(builder, builder);
      builder.buildInto(this);
    } else {
      return func.apply(this, arguments);
    }
  };
}

function parseFieldExpression(expression, extractAsText) {
  let parsed = jsonFieldExpressionParser.parse(expression);
  let jsonRefs = _(parsed.access).pluck('ref').value().join(",");
  let extractor = extractAsText ? '#>>' : '#>';
  let middleQuotedColumnName = parsed.columnName.split('.').join('"."');
  return `"${middleQuotedColumnName}"${extractor}'{${jsonRefs}}'`;
}

function whereJsonbRefOnLeftJsonbValOrRefOnRight(builder, fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix) {
  let queryParams = whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix);
  return builder.whereRaw.apply(builder, queryParams);
}

function orWhereJsonbRefOnLeftJsonbValOrRefOnRight(builder, fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix) {
  let queryParams = whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix);
  return builder.orWhereRaw.apply(builder, queryParams);
}

function whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix) {
  let fieldReference = parseFieldExpression(fieldExpression);

  if (_.isString(jsonObjectOrFieldExpression)) {
    let rightHandReference = parseFieldExpression(jsonObjectOrFieldExpression);
    let refRefQuery = ["(", fieldReference, ")::jsonb", operator, "(", rightHandReference, ")::jsonb"];
    if (queryPrefix) {
      refRefQuery.unshift(queryPrefix);
    }
    return [refRefQuery.join(" ")];
  } else if (_.isObject(jsonObjectOrFieldExpression)) {
    let refValQuery = ["(", fieldReference, ")::jsonb", operator, "?::jsonb"];
    if (queryPrefix) {
      refValQuery.unshift(queryPrefix);
    }
    return [refValQuery.join(" "), JSON.stringify(jsonObjectOrFieldExpression)];
  }

  throw new Error("Invalid right hand expression.");
}

function whereJsonFieldRightStringArrayOnLeft(builder, fieldExpression, operator, keys) {
  return builder.whereRaw(whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys));
}

function orWhereJsonFieldRightStringArrayOnLeft(builder, fieldExpression, operator, keys) {
  return builder.orWhereRaw(whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys));
}

function whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys) {
  let knex = builder._knex;
  let fieldReference = parseFieldExpression(fieldExpression);
  keys = _.isArray(keys) ? keys : [keys];

  let questionMarksArray = _.map(keys, function (key) {
    if (!_.isString(key)) {
      throw new Error("All keys to find must be strings.");
    }
    return "?";
  });

  let rawSqlTemplateString = "array[" + questionMarksArray.join(",") + "]";
  let rightHandExpression = knex.raw(rawSqlTemplateString, keys);

  return `${fieldReference} ${operator.replace('?', '\\?')} ${rightHandExpression}`;
}

function whereJsonFieldQuery(knex, fieldExpression, operator, value) {
  let fieldReference = parseFieldExpression(fieldExpression, true);
  let normalizedOperator = normalizeOperator(knex, operator);

  // json type comparison takes json type in string format
  let cast;
  let escapedValue = knex.raw(" ?", [value]);
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

  return `(${fieldReference})${cast} ${normalizedOperator} ${escapedValue}`;
}

function normalizeOperator(knex, operator) {
  let trimmedLowerCase = operator.trim().toLowerCase();

  switch (trimmedLowerCase) {
    case "is":
    case "is not":
      return trimmedLowerCase;
    default:
      return knex.client.formatter().operator(operator);
  }
}
