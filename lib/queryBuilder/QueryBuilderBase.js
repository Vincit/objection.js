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

  get isObjectionQueryBuilderBase() {
    return true;
  }

  isSelectAll() {
    return !this.has(QueryBuilderBase.SelectSelector) && !this.has(QueryBuilderBase.WhereSelector);
  }

  modify() {
    const func = arguments[0];

    if (!func) {
      return this;
    }

    if (arguments.length === 1) {
      func.call(this, this);
    } else {
      const args = new Array(arguments.length);
      args[0] = this;

      for (let i = 1, l = args.length; i < l; ++i) {
        args[i] = arguments[i];
      }

      func.apply(this, args);
    }

    return this;
  }

  transacting(trx) {
    this._context.knex = trx || null;
    return this;
  }

  clearSelect() {
    return this.clear(QueryBuilderBase.SelectSelector);
  }

  clearWhere() {
    return this.clear(QueryBuilderBase.WhereSelector);
  }

  select() {}
  insert() {}
  update() {}
  delete() {}
  del() {}
  forUpdate() {}
  forShare() {}
  as() {}
  columns() {}
  column() {}
  from() {}
  fromJS() {}
  into() {}
  withSchema() {}
  table() {}
  distinct() {}
  join() {}
  joinRaw() {}
  innerJoin() {}
  leftJoin() {}
  leftOuterJoin() {}
  rightJoin() {}
  rightOuterJoin() {}
  outerJoin() {}
  fullOuterJoin() {}
  crossJoin() {}
  where() {}
  andWhere() {}
  orWhere() {}
  whereNot() {}
  orWhereNot() {}
  whereRaw() {}
  whereWrapped() {}
  havingWrapped() {}
  orWhereRaw() {}
  whereExists() {}
  orWhereExists() {}
  whereNotExists() {}
  orWhereNotExists() {}
  whereIn() {}
  orWhereIn() {}
  whereNotIn() {}
  orWhereNotIn() {}
  whereNull() {}
  orWhereNull() {}
  whereNotNull() {}
  orWhereNotNull() {}
  whereBetween() {}
  andWhereBetween() {}
  whereNotBetween() {}
  andWhereNotBetween() {}
  orWhereBetween() {}
  orWhereNotBetween() {}
  groupBy() {}
  groupByRaw() {}
  orderBy() {}
  orderByRaw() {}
  union() {}
  unionAll() {}
  having() {}
  havingRaw() {}
  orHaving() {}
  orHavingRaw() {}
  offset() {}
  limit() {}
  count() {}
  countDistinct() {}
  min() {}
  max() {}
  sum() {}
  sumDistinct() {}
  avg() {}
  avgDistinct() {}
  debug() {}
  returning() {}
  truncate() {}
  connection() {}
  options() {}
  columnInfo() {}
  with() {}
  whereRef(lhs, op, rhs) {}
  orWhereRef(lhs, op, rhs) {}
  whereComposite(cols, op, values) {}
  whereInComposite(columns, values) {}
  whereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}
  orWhereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}
  whereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}
  orWhereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}
  whereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}
  orWhereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}
  whereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}
  orWhereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}
  whereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}
  orWhereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}
  whereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}
  orWhereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}
  whereJsonNotArray(fieldExpression) {}
  orWhereJsonNotArray(fieldExpression) {}
  whereJsonNotObject(fieldExpression) {}
  orWhereJsonNotObject(fieldExpression) {}
  whereJsonHasAny(fieldExpression, keys) {}
  orWhereJsonHasAny(fieldExpression, keys) {}
  whereJsonHasAll(fieldExpression, keys) {}
  orWhereJsonHasAll(fieldExpression, keys) {}
  whereJsonField(fieldExpression, operator, value) {}
  orWhereJsonField(fieldExpression, operator, value) {}

  whereJsonIsArray(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, []);
  }

  orWhereJsonIsArray(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, []);
  }

  whereJsonIsObject(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, {});
  }

  orWhereJsonIsObject(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, {});
  }
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