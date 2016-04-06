import _ from 'lodash';
import queryBuilderMethod from './decorators/queryBuilderMethod';
import {inherits} from '../utils/classUtils';

import QueryBuilderContextBase from './QueryBuilderContextBase';

import KnexMethod from './methods/KnexMethod';
import WhereRefMethod from './methods/WhereRefMethod';
import WhereCompositeMethod from './methods/WhereCompositeMethod';
import WhereInCompositeMethod from './methods/WhereInCompositeMethod';
import WhereInCompositeSqliteMethod from './methods/WhereInCompositeSqliteMethod';

import WhereJsonPostgresMethod from './methods/jsonApi/WhereJsonPostgresMethod';
import WhereJsonHasPostgresMethod from './methods/jsonApi/WhereJsonHasPostgresMethod';
import WhereJsonFieldPostgresMethod from './methods/jsonApi/WhereJsonFieldPostgresMethod';
import WhereJsonNotObjectPostgresMethod from './methods/jsonApi/WhereJsonNotObjectPostgresMethod';

/**
 * This class is a thin wrapper around knex query builder. This class allows us to add our own
 * query builder methods without monkey patching knex query builder.
 */

export default class QueryBuilderBase {

  constructor(knex, QueryBuilderContext) {
    /**
     * @type {knex}
     * @private
     */
    this._knex = knex;
    /**
     * @type {Array.<QueryBuilderMethod>}
     * @private
     */
    this._methodCalls = [];
    /**
     * @type {QueryBuilderContextBase}
     * @private
     */
    this._context = new (QueryBuilderContext || QueryBuilderContextBase)();
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
   * @param {Object=} ctx
   * @returns {Object|QueryBuilderBase}
   */
  context(ctx) {
    if (arguments.length === 0) {
      return this._context.userContext;
    } else {
      this._context.userContext = ctx;
      return this;
    }
  }

  /**
   * @param {QueryBuilderContextBase=} ctx
   * @returns {QueryBuilderContextBase|QueryBuilderBase}
   */
  internalContext(ctx) {
    if (arguments.length === 0) {
      return this._context;
    } else {
      this._context = ctx;
      return this;
    }
  }

  /**
   * @param {knex=} knex
   * @returns {Object|QueryBuilderBase}
   */
  knex(knex) {
    if (arguments.length === 0) {
      return this._knex;
    } else {
      this._knex = knex;
      return this;
    }
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
   * @param {RegExp=} methodNameRegex
   */
  clear(methodNameRegex) {
    if (_.isRegExp(methodNameRegex)) {
      this._methodCalls = _.reject(this._methodCalls, method => {
        return methodNameRegex.test(method.name)
      });
    } else {
      this._methodCalls = [];
    }

    return this;
  }

  /**
   * @param {QueryBuilderBase} queryBuilder
   * @param {RegExp} methodNameRegex
   */
  copyFrom(queryBuilder, methodNameRegex) {
    _.each(queryBuilder._methodCalls, method => {
      if (!methodNameRegex || methodNameRegex.test(method.name)) {
        this._methodCalls.push(method);
      }
    });

    return this;
  }

  /**
   * @param {RegExp} methodNameRegex
   * @returns {boolean}
   */
  has(methodNameRegex) {
    return _.some(this._methodCalls, method => {
      return methodNameRegex.test(method.name);
    });
  }

  /**
   * @param {QueryBuilderMethod} method
   * @param {Array.<*>} args
   * @returns {QueryBuilderBase}
   */
   callQueryBuilderMethod(method, args) {
    if (method.call(this, args)) {
      this._methodCalls.push(method);
    }

    return this;
  }

  /**
   * @param {string} methodName
   * @param {Array.<*>} args
   * @returns {QueryBuilderBase}
   */
  callKnexQueryBuilderMethod(methodName, args) {
    return this.callQueryBuilderMethod(new KnexMethod(this, methodName), args);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  clone() {
    return this.cloneInto(new this.constructor(this._knex));
  }

  /**
   * @protected
   * @returns {QueryBuilderBase}
   */
  cloneInto(builder) {
    builder._knex = this._knex;
    builder._methodCalls = this._methodCalls.slice();
    builder._context = this._context.clone();
    
    return builder;
  }

  /**
   * @returns {knex.QueryBuilder}
   */
  build() {
    return this.buildInto(this._knex.queryBuilder());
  }

  /**
   * @protected
   */
  buildInto(knexBuilder) {
    _.each(this._methodCalls, method => method.onBeforeBuild(this));
    _.each(this._methodCalls, method => method.onBuild(knexBuilder, this));

    return knexBuilder;
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
  @queryBuilderMethod(KnexMethod)
  insert(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  update(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  delete(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod, 'delete')
  del(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  select(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  forUpdate(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  forShare(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  as(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  columns(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  column(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  from(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  fromJS(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  into(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  withSchema(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  table(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  distinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  join(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  joinRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  innerJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  leftJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  leftOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  rightJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  rightOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  outerJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  fullOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  crossJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  where(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  andWhere(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhere(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereNot(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhereNot(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereWrapped(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  havingWrapped(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhereRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhereExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereNotExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhereNotExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhereIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereNotIn(...args) {}

  /**
   */
  @queryBuilderMethod(KnexMethod)
  orWhereNotIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhereNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereNotNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhereNotNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  whereNotBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhereBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orWhereNotBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  groupBy(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  groupByRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orderBy(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orderByRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  union(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  unionAll(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  having(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  havingRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orHaving(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  orHavingRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  offset(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  limit(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  count(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  countDistinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  min(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  max(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  sum(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  avg(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  avgDistinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  debug(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  returning(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  truncate(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(KnexMethod)
  connection(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereRefMethod, {bool: 'and'}])
  whereRef(lhs, op, rhs) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereRefMethod, {bool: 'or'}])
  orWhereRef(lhs, op, rhs) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod(WhereCompositeMethod)
  whereComposite(cols, op, values) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod({
    default: WhereInCompositeMethod,
    sqlite3: WhereInCompositeSqliteMethod
  })
  whereInComposite(columns, values) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '=', bool: 'and'}])
  whereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '=', bool: 'or'}])
  orWhereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '!=', bool: 'and'}])
  whereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '!=', bool: 'or'}])
  orWhereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '@>', bool: 'and'}])
  whereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '@>', bool: 'or'}])
  orWhereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '@>', bool: 'and', prefix: 'not'}])
  whereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '@>', bool: 'or', prefix: 'not'}])
  orWhereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '<@', bool: 'and'}])
  whereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '<@', bool: 'or'}])
  orWhereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '<@', bool: 'and', prefix: 'not'}])
  whereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonPostgresMethod, {operator: '<@', bool: 'or', prefix: 'not'}])
  orWhereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonIsArray(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, []);
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonIsArray(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, []);
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonIsObject(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, {});
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonIsObject(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, {});
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonNotObjectPostgresMethod, {bool: 'and', compareValue: []}])
  whereJsonNotArray(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonNotObjectPostgresMethod, {bool: 'or', compareValue: []}])
  orWhereJsonNotArray(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonNotObjectPostgresMethod, {bool: 'and', compareValue: {}}])
  whereJsonNotObject(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonNotObjectPostgresMethod, {bool: 'or', compareValue: {}}])
  orWhereJsonNotObject(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonHasPostgresMethod, {bool: 'and', operator: '?|'}])
  whereJsonHasAny(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonHasPostgresMethod, {bool: 'or', operator: '?|'}])
  orWhereJsonHasAny(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonHasPostgresMethod, {bool: 'and', operator: '?&'}])
  whereJsonHasAll(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonHasPostgresMethod, {bool: 'or', operator: '?&'}])
  orWhereJsonHasAll(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string} operator
   * @param {boolean|Number|string|null} value
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonFieldPostgresMethod, {bool: 'and'}])
  whereJsonField(fieldExpression, operator, value) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string} operator
   * @param {boolean|Number|string|null} value
   * @returns {QueryBuilderBase}
   */
  @queryBuilderMethod([WhereJsonFieldPostgresMethod, {bool: 'or'}])
  orWhereJsonField(fieldExpression, operator, value) {}
}