'use strict';

const decorate = require('../utils/decorators/decorate');
const queryBuilderOperation = require('./decorators/queryBuilderOperation');
const QueryBuilderOperationSupport = require('./QueryBuilderOperationSupport');

const KnexOperation = require('./operations/KnexOperation');
const SelectOperation = require('./operations/SelectOperation');
const WhereRefOperation = require('./operations/WhereRefOperation');
const ReturningOperation = require('./operations/ReturningOperation');
const WhereCompositeOperation = require('./operations/WhereCompositeOperation');
const WhereInCompositeOperation = require('./operations/whereInComposite/WhereInCompositeOperation');
const WhereInCompositeSqliteOperation = require('./operations/whereInComposite/WhereInCompositeSqliteOperation');

const WhereJsonPostgresOperation = require('./operations/jsonApi/WhereJsonPostgresOperation');
const WhereJsonHasPostgresOperation = require('./operations/jsonApi/WhereJsonHasPostgresOperation');
const WhereJsonFieldPostgresOperation = require('./operations/jsonApi/WhereJsonFieldPostgresOperation');
const WhereJsonNotObjectPostgresOperation = require('./operations/jsonApi/WhereJsonNotObjectPostgresOperation');

class QueryBuilderBase extends QueryBuilderOperationSupport {

  /**
   * @return {boolean}
   */
  get isObjectionQueryBuilderBase() {
    return true;
  }

  /**
   * @return {boolean}
   */
  isSelectAll() {
    return !this.has(QueryBuilderBase.SelectSelector) && !this.has(QueryBuilderBase.WhereSelector);
  }

  /**
   * @param {function} func
   * @returns {QueryBuilderBase}
   */
  modify(func) {
    if (!func) {
      return this;
    }

    if (arguments.length === 1) {
      func.call(this, this);
    } else {
      let args = new Array(arguments.length);

      args[0] = this;
      for (let i = 1, l = args.length; i < l; ++i) {
        args[i] = arguments[i];
      }

      func.apply(this, args);
    }

    return this;
  }

  /**
   * @param {Transaction} trx
   * @returns {QueryBuilderBase}
   */
  transacting(trx) {
    this._context.knex = trx || null;
    return this;
  }

  /**
   * @returns {QueryBuilderBase}
   */
  clearSelect() {
    return this.clear(QueryBuilderBase.SelectSelector);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  clearWhere() {
    return this.clear(QueryBuilderBase.WhereSelector);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  select() {}

  /**
   * @returns {QueryBuilderBase}
   */
  insert() {}

  /**
   * @returns {QueryBuilderBase}
   */
  update() {}

  /**
   * @returns {QueryBuilderBase}
   */
  delete() {}

  /**
   * @returns {QueryBuilderBase}
   */
  del() {}

  /**
   * @returns {QueryBuilderBase}
   */
  forUpdate() {}

  /**
   * @returns {QueryBuilderBase}
   */
  forShare() {}

  /**
   * @returns {QueryBuilderBase}
   */
  as() {}

  /**
   * @returns {QueryBuilderBase}
   */
  columns() {}

  /**
   * @returns {QueryBuilderBase}
   */
  column() {}

  /**
   * @returns {QueryBuilderBase}
   */
  from() {}

  /**
   * @returns {QueryBuilderBase}
   */
  fromJS() {}

  /**
   * @returns {QueryBuilderBase}
   */
  into() {}

  /**
   * @returns {QueryBuilderBase}
   */
  withSchema() {}

  /**
   * @returns {QueryBuilderBase}
   */
  table() {}

  /**
   * @returns {QueryBuilderBase}
   */
  distinct() {}

  /**
   * @returns {QueryBuilderBase}
   */
  join() {}

  /**
   * @returns {QueryBuilderBase}
   */
  joinRaw() {}

  /**
   * @returns {QueryBuilderBase}
   */
  innerJoin() {}

  /**
   * @returns {QueryBuilderBase}
   */
  leftJoin() {}

  /**
   * @returns {QueryBuilderBase}
   */
  leftOuterJoin() {}

  /**
   * @returns {QueryBuilderBase}
   */
  rightJoin() {}

  /**
   * @returns {QueryBuilderBase}
   */
  rightOuterJoin() {}

  /**
   * @returns {QueryBuilderBase}
   */
  outerJoin() {}

  /**
   * @returns {QueryBuilderBase}
   */
  fullOuterJoin() {}

  /**
   * @returns {QueryBuilderBase}
   */
  crossJoin() {}

  /**
   * @returns {QueryBuilderBase}
   */
  where() {}

  /**
   * @returns {QueryBuilderBase}
   */
  andWhere() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhere() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereNot() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereNot() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereRaw() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereWrapped() {}

  /**
   * @returns {QueryBuilderBase}
   */
  havingWrapped() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereRaw() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereExists() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereExists() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereNotExists() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereNotExists() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereIn() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereIn() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereNotIn() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereNotIn() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereNull() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereNull() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereNotNull() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereNotNull() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereBetween() {}

  /**
   * @returns {QueryBuilderBase}
   */
  andWhereBetween() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereNotBetween() {}

  /**
   * @returns {QueryBuilderBase}
   */
  andWhereNotBetween() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereBetween() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereNotBetween() {}

  /**
   * @returns {QueryBuilderBase}
   */
  groupBy() {}

  /**
   * @returns {QueryBuilderBase}
   */
  groupByRaw() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orderBy() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orderByRaw() {}

  /**
   * @returns {QueryBuilderBase}
   */
  union() {}

  /**
   * @returns {QueryBuilderBase}
   */
  unionAll() {}

  /**
   * @returns {QueryBuilderBase}
   */
  having() {}

  /**
   * @returns {QueryBuilderBase}
   */
  havingRaw() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orHaving() {}

  /**
   * @returns {QueryBuilderBase}
   */
  orHavingRaw() {}

  /**
   * @returns {QueryBuilderBase}
   */
  offset() {}

  /**
   * @returns {QueryBuilderBase}
   */
  limit() {}

  /**
   * @returns {QueryBuilderBase}
   */
  count() {}

  /**
   * @returns {QueryBuilderBase}
   */
  countDistinct() {}

  /**
   * @returns {QueryBuilderBase}
   */
  min() {}

  /**
   * @returns {QueryBuilderBase}
   */
  max() {}

  /**
   * @returns {QueryBuilderBase}
   */
  sum() {}

  /**
   * @returns {QueryBuilderBase}
   */
  sumDistinct() {}

  /**
   * @returns {QueryBuilderBase}
   */
  avg() {}

  /**
   * @returns {QueryBuilderBase}
   */
  avgDistinct() {}

  /**
   * @returns {QueryBuilderBase}
   */
  debug() {}

  /**
   * @returns {QueryBuilderBase}
   */
  returning() {}

  /**
   * @returns {QueryBuilderBase}
   */
  truncate() {}

  /**
   * @returns {QueryBuilderBase}
   */
  connection() {}

  /**
   * @returns {QueryBuilderBase}
   */
  options() {}

  /**
   * @returns {QueryBuilderBase}
   */
  columnInfo() {}

  /**
   * @returns {QueryBuilderBase}
   */
  with() {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereRef(lhs, op, rhs) {}

  /**
   * @returns {QueryBuilderBase}
   */
  orWhereRef(lhs, op, rhs) {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereComposite(cols, op, values) {}

  /**
   * @returns {QueryBuilderBase}
   */
  whereInComposite(columns, values) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
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
  whereJsonNotArray(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonNotArray(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonNotObject(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonNotObject(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  whereJsonHasAny(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  orWhereJsonHasAny(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  whereJsonHasAll(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  orWhereJsonHasAll(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string} operator
   * @param {boolean|Number|string|null} value
   * @returns {QueryBuilderBase}
   */
  whereJsonField(fieldExpression, operator, value) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string} operator
   * @param {boolean|Number|string|null} value
   * @returns {QueryBuilderBase}
   */
  orWhereJsonField(fieldExpression, operator, value) {}
}

QueryBuilderBase.SelectSelector = SelectOperation;
QueryBuilderBase.WhereSelector = /where|orWhere|andWhere/;
QueryBuilderBase.FromSelector = /^(from|into|table)$/;

/**
 * Until node gets decorators, we need to apply them like this.
 */
decorate(QueryBuilderBase.prototype, [{
  decorator: queryBuilderOperation(SelectOperation),
  properties: [
    'select',
    'avgDistinct',
    'avg',
    'sumDistinct',
    'sum',
    'max',
    'min',
    'countDistinct',
    'count',
    'distinct',
    'column',
    'columns'
  ]
}, {
  decorator: queryBuilderOperation(KnexOperation),
  properties: [
    'insert',
    'update',
    'delete',
    'forUpdate',
    'forShare',
    'as',
    'from',
    'fromJS',
    'into',
    'withSchema',
    'table',
    'join',
    'joinRaw',
    'innerJoin',
    'leftJoin',
    'leftOuterJoin',
    'rightJoin',
    'rightOuterJoin',
    'outerJoin',
    'fullOuterJoin',
    'crossJoin',
    'where',
    'andWhere',
    'orWhere',
    'whereNot',
    'orWhereNot',
    'whereRaw',
    'whereWrapped',
    'havingWrapped',
    'orWhereRaw',
    'whereExists',
    'orWhereExists',
    'whereNotExists',
    'orWhereNotExists',
    'whereIn',
    'orWhereIn',
    'whereNotIn',
    'orWhereNotIn',
    'whereNull',
    'orWhereNull',
    'whereNotNull',
    'orWhereNotNull',
    'whereBetween',
    'andWhereBetween',
    'whereNotBetween',
    'andWhereNotBetween',
    'orWhereBetween',
    'orWhereNotBetween',
    'groupBy',
    'groupByRaw',
    'orderBy',
    'orderByRaw',
    'union',
    'unionAll',
    'having',
    'havingRaw',
    'orHaving',
    'orHavingRaw',
    'offset',
    'limit',
    'debug',
    'truncate',
    'connection',
    'options',
    'columnInfo',
    'with'
  ]
}, {
  decorator: queryBuilderOperation(KnexOperation, 'delete'),
  properties: ['del']
}, {
  decorator: queryBuilderOperation(ReturningOperation),
  properties: ['returning']
}, {
  decorator: queryBuilderOperation([WhereRefOperation, {bool: 'and'}]),
  properties: ['whereRef']
}, {
  decorator: queryBuilderOperation([WhereRefOperation, {bool: 'or'}]),
  properties: ['orWhereRef']
}, {
  decorator: queryBuilderOperation(WhereCompositeOperation),
  properties: ['whereComposite']
}, {
  decorator: queryBuilderOperation({
    default: WhereInCompositeOperation,
    sqlite3: WhereInCompositeSqliteOperation
  }),
  properties: ['whereInComposite']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '=', bool: 'and'}]),
  properties: ['whereJsonEquals']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '=', bool: 'or'}]),
  properties: ['orWhereJsonEquals']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '!=', bool: 'and'}]),
  properties: ['whereJsonNotEquals']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '!=', bool: 'or'}]),
  properties: ['orWhereJsonNotEquals']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'and'}]),
  properties: ['whereJsonSupersetOf']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'or'}]),
  properties: ['orWhereJsonSupersetOf']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'and', prefix: 'not'}]),
  properties: ['whereJsonNotSupersetOf']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'or', prefix: 'not'}]),
  properties: ['orWhereJsonNotSupersetOf']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'and'}]),
  properties: ['whereJsonSubsetOf']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'or'}]),
  properties: ['orWhereJsonSubsetOf']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'and', prefix: 'not'}]),
  properties: ['whereJsonNotSubsetOf']
}, {
  decorator: queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'or', prefix: 'not'}]),
  properties: ['orWhereJsonNotSubsetOf']
}, {
  decorator: queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'and', compareValue: []}]),
  properties: ['whereJsonNotArray']
}, {
  decorator: queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'or', compareValue: []}]),
  properties: ['orWhereJsonNotArray']
}, {
  decorator: queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'and', compareValue: {}}]),
  properties: ['whereJsonNotObject']
}, {
  decorator: queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'or', compareValue: {}}]),
  properties: ['orWhereJsonNotObject']
}, {
  decorator: queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'and', operator: '?|'}]),
  properties: ['whereJsonHasAny']
}, {
  decorator: queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'or', operator: '?|'}]),
  properties: ['orWhereJsonHasAny']
}, {
  decorator: queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'and', operator: '?&'}]),
  properties: ['whereJsonHasAll']
}, {
  decorator: queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'or', operator: '?&'}]),
  properties: ['orWhereJsonHasAll']
}, {
  decorator: queryBuilderOperation([WhereJsonFieldPostgresOperation, {bool: 'and'}]),
  properties: ['whereJsonField']
}, {
  decorator: queryBuilderOperation([WhereJsonFieldPostgresOperation, {bool: 'or'}]),
  properties: ['orWhereJsonField']
}]);

module.exports = QueryBuilderBase;