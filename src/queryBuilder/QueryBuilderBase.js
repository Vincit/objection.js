import _ from 'lodash';
import queryBuilderOperation from './decorators/queryBuilderOperation';
import {inherits} from '../utils/classUtils';
import deprecated from '../utils/decorators/deprecated'

import QueryBuilderContextBase from './QueryBuilderContextBase';

import KnexOperation from './operations/KnexOperation';
import WhereRefOperation from './operations/WhereRefOperation';
import WhereCompositeOperation from './operations/WhereCompositeOperation';
import WhereInCompositeOperation from './operations/WhereInCompositeOperation';
import WhereInCompositeSqliteOperation from './operations/WhereInCompositeSqliteOperation';

import WhereJsonPostgresOperation from './operations/jsonApi/WhereJsonPostgresOperation';
import WhereJsonHasPostgresOperation from './operations/jsonApi/WhereJsonHasPostgresOperation';
import WhereJsonFieldPostgresOperation from './operations/jsonApi/WhereJsonFieldPostgresOperation';
import WhereJsonNotObjectPostgresOperation from './operations/jsonApi/WhereJsonNotObjectPostgresOperation';

/**
 * This class is a thin wrapper around knex query builder. This class allows us to add our own
 * query builder methods without monkey patching knex query builder.
 */

export default class QueryBuilderBase {

  constructor(knex, QueryBuilderContext) {
    /**
     * @type {knex}
     * @protected
     */
    this._knex = knex;
    /**
     * @type {Array.<QueryBuilderOperation>}
     * @protected
     */
    this._operations = [];
    /**
     * @type {QueryBuilderContextBase}
     * @protected
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
  @deprecated({removedIn: '0.7.0', useInstead: 'modify'})
  call(func) {
    func.call(this, this);
    return this;
  }

  /**
   * @param {function} func
   * @returns {QueryBuilderBase}
   */
  modify(func) {
    if (arguments.length === 1) {
      func.call(this, this);
    } else {
      let args = _.toArray(arguments);
      args[0] = this;
      func.apply(this, args);
    }

    return this;
  }

  /**
   * @param {RegExp=} methodNameRegex
   */
  clear(methodNameRegex) {
    if (_.isRegExp(methodNameRegex)) {
      this._operations = _.reject(this._operations, method => {
        return methodNameRegex.test(method.name)
      });
    } else {
      this._operations = [];
    }

    return this;
  }

  /**
   * @param {QueryBuilderBase} queryBuilder
   * @param {RegExp} methodNameRegex
   */
  copyFrom(queryBuilder, methodNameRegex) {
    _.each(queryBuilder._operations, method => {
      if (!methodNameRegex || methodNameRegex.test(method.name)) {
        this._operations.push(method);
      }
    });

    return this;
  }

  /**
   * @param {RegExp|Constructor.<? extends QueryBuilderOperation>} operationSelector
   * @returns {boolean}
   */
  has(operationSelector) {
    if (_.isRegExp(operationSelector)) {
      return _.some(this._operations, operation => {
        return operationSelector.test(operation.name);
      });
    } else {
      return _.some(this._operations, operation => {
        return operation instanceof operationSelector;
      });
    }
  }

  /**
   * @param {QueryBuilderOperation} operation
   * @param {Array.<*>} args
   * @param {Boolean=} pushFront
   * @returns {QueryBuilderBase}
   */
   callQueryBuilderOperation(operation, args, pushFront) {
    if (operation.call(this, args || [])) {
      if (pushFront) {
        this._operations.splice(0, 0, operation);
      } else {
        this._operations.push(operation);
      }
    }

    return this;
  }

  /**
   * @param {string} methodName
   * @param {Array.<*>} args
   * @returns {QueryBuilderBase}
   */
  callKnexQueryBuilderOperation(methodName, args) {
    return this.callQueryBuilderOperation(new KnexOperation(this, methodName), args);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  clone() {
    return this.baseCloneInto(new this.constructor(this._knex));
  }

  /**
   * @protected
   * @returns {QueryBuilderBase}
   */
  baseCloneInto(builder) {
    builder._knex = this._knex;
    builder._operations = this._operations.slice();
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
    _.each(this._operations, method => method.onBeforeBuild(this));
    _.each(this._operations, method => method.onBuild(knexBuilder, this));

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
  @queryBuilderOperation(KnexOperation)
  insert(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  update(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  delete(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation, 'delete')
  del(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  select(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  forUpdate(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  forShare(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  as(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  columns(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  column(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  from(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  fromJS(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  into(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  withSchema(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  table(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  distinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  join(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  joinRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  innerJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  leftJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  leftOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  rightJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  rightOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  outerJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  fullOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  crossJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  where(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andWhere(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhere(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNot(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNot(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereWrapped(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  havingWrapped(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNotExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNotExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNotIn(...args) {}

  /**
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNotIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNotNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNotNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNotBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNotBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  groupBy(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  groupByRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orderBy(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orderByRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  union(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  unionAll(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  having(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  havingRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orHaving(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orHavingRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  offset(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  limit(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  count(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  countDistinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  min(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  max(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  sum(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  avg(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  avgDistinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  debug(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  returning(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  truncate(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  connection(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  options(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  columnInfo(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereRefOperation, {bool: 'and'}])
  whereRef(lhs, op, rhs) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereRefOperation, {bool: 'or'}])
  orWhereRef(lhs, op, rhs) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(WhereCompositeOperation)
  whereComposite(cols, op, values) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation({
    default: WhereInCompositeOperation,
    sqlite3: WhereInCompositeSqliteOperation
  })
  whereInComposite(columns, values) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '=', bool: 'and'}])
  whereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '=', bool: 'or'}])
  orWhereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '!=', bool: 'and'}])
  whereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '!=', bool: 'or'}])
  orWhereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'and'}])
  whereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'or'}])
  orWhereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'and', prefix: 'not'}])
  whereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'or', prefix: 'not'}])
  orWhereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'and'}])
  whereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'or'}])
  orWhereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'and', prefix: 'not'}])
  whereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'or', prefix: 'not'}])
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
  @queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'and', compareValue: []}])
  whereJsonNotArray(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'or', compareValue: []}])
  orWhereJsonNotArray(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'and', compareValue: {}}])
  whereJsonNotObject(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'or', compareValue: {}}])
  orWhereJsonNotObject(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'and', operator: '?|'}])
  whereJsonHasAny(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'or', operator: '?|'}])
  orWhereJsonHasAny(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'and', operator: '?&'}])
  whereJsonHasAll(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'or', operator: '?&'}])
  orWhereJsonHasAll(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string} operator
   * @param {boolean|Number|string|null} value
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonFieldPostgresOperation, {bool: 'and'}])
  whereJsonField(fieldExpression, operator, value) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string} operator
   * @param {boolean|Number|string|null} value
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonFieldPostgresOperation, {bool: 'or'}])
  orWhereJsonField(fieldExpression, operator, value) {}
}