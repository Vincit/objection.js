const QueryBuilderOperationSupport = require('./QueryBuilderOperationSupport');
const { isSqlite, isMsSql } = require('../utils/knexUtils');

const KnexOperation = require('./operations/KnexOperation');
const SelectOperation = require('./operations/select/SelectOperation');
const ReturningOperation = require('./operations/ReturningOperation');
const WhereCompositeOperation = require('./operations/WhereCompositeOperation');
const WhereInCompositeOperation = require('./operations/whereInComposite/WhereInCompositeOperation');
const WhereInCompositeSqliteOperation = require('./operations/whereInComposite/WhereInCompositeSqliteOperation');
const WhereInCompositeMsSqlOperation = require('./operations/whereInComposite/WhereInCompositeMsSqlOperation');

const WhereJsonPostgresOperation = require('./operations/jsonApi/WhereJsonPostgresOperation');
const WhereJsonHasPostgresOperation = require('./operations/jsonApi/WhereJsonHasPostgresOperation');
const WhereJsonNotObjectPostgresOperation = require('./operations/jsonApi/WhereJsonNotObjectPostgresOperation');

const SelectSelector = SelectOperation;
const WhereSelector = /^(where|orWhere|andWhere)/;
const OrderBySelector = /orderBy/;
const JoinSelector = /(join|joinRaw)$/i;
const FromSelector = /^(from|into|table)$/;

class QueryBuilderBase extends QueryBuilderOperationSupport {
  static get SelectSelector() {
    return SelectSelector;
  }

  static get WhereSelector() {
    return WhereSelector;
  }

  static get JoinSelector() {
    return JoinSelector;
  }

  static get FromSelector() {
    return FromSelector;
  }

  static get OrderBySelector() {
    return OrderBySelector;
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
    return this.clear(SelectSelector);
  }

  clearWhere() {
    return this.clear(WhereSelector);
  }

  clearOrder() {
    return this.clear(OrderBySelector);
  }

  select() {
    return this.addOperation(new SelectOperation('select'), arguments);
  }

  insert() {
    return this.addOperation(new KnexOperation('insert'), arguments);
  }

  update() {
    return this.addOperation(new KnexOperation('update'), arguments);
  }

  delete() {
    return this.addOperation(new KnexOperation('delete'), arguments);
  }

  del() {
    return this.addOperation(new KnexOperation('delete'), arguments);
  }

  forUpdate() {
    return this.addOperation(new KnexOperation('forUpdate'), arguments);
  }

  forShare() {
    return this.addOperation(new KnexOperation('forShare'), arguments);
  }

  as() {
    return this.addOperation(new KnexOperation('as'), arguments);
  }

  columns() {
    return this.addOperation(new SelectOperation('columns'), arguments);
  }

  column() {
    return this.addOperation(new SelectOperation('column'), arguments);
  }

  from() {
    return this.addOperation(new KnexOperation('from'), arguments);
  }

  fromJS() {
    return this.addOperation(new KnexOperation('fromJS'), arguments);
  }

  into() {
    return this.addOperation(new KnexOperation('into'), arguments);
  }

  withSchema() {
    return this.addOperation(new KnexOperation('withSchema'), arguments);
  }

  table() {
    return this.addOperation(new KnexOperation('table'), arguments);
  }

  distinct() {
    return this.addOperation(new SelectOperation('distinct'), arguments);
  }

  join() {
    return this.addOperation(new KnexOperation('join'), arguments);
  }

  joinRaw() {
    return this.addOperation(new KnexOperation('joinRaw'), arguments);
  }

  innerJoin() {
    return this.addOperation(new KnexOperation('innerJoin'), arguments);
  }

  leftJoin() {
    return this.addOperation(new KnexOperation('leftJoin'), arguments);
  }

  leftOuterJoin() {
    return this.addOperation(new KnexOperation('leftOuterJoin'), arguments);
  }

  rightJoin() {
    return this.addOperation(new KnexOperation('rightJoin'), arguments);
  }

  rightOuterJoin() {
    return this.addOperation(new KnexOperation('rightOuterJoin'), arguments);
  }

  outerJoin() {
    return this.addOperation(new KnexOperation('outerJoin'), arguments);
  }

  fullOuterJoin() {
    return this.addOperation(new KnexOperation('fullOuterJoin'), arguments);
  }

  crossJoin() {
    return this.addOperation(new KnexOperation('crossJoin'), arguments);
  }

  where() {
    return this.addOperation(new KnexOperation('where'), arguments);
  }

  andWhere() {
    return this.addOperation(new KnexOperation('andWhere'), arguments);
  }

  orWhere() {
    return this.addOperation(new KnexOperation('orWhere'), arguments);
  }

  whereNot() {
    return this.addOperation(new KnexOperation('whereNot'), arguments);
  }

  orWhereNot() {
    return this.addOperation(new KnexOperation('orWhereNot'), arguments);
  }

  whereRaw() {
    return this.addOperation(new KnexOperation('whereRaw'), arguments);
  }

  andWhereRaw() {
    return this.addOperation(new KnexOperation('andWhereRaw'), arguments);
  }

  orWhereRaw() {
    return this.addOperation(new KnexOperation('orWhereRaw'), arguments);
  }

  whereWrapped() {
    return this.addOperation(new KnexOperation('whereWrapped'), arguments);
  }

  havingWrapped() {
    return this.addOperation(new KnexOperation('havingWrapped'), arguments);
  }

  whereExists() {
    return this.addOperation(new KnexOperation('whereExists'), arguments);
  }

  orWhereExists() {
    return this.addOperation(new KnexOperation('orWhereExists'), arguments);
  }

  whereNotExists() {
    return this.addOperation(new KnexOperation('whereNotExists'), arguments);
  }

  orWhereNotExists() {
    return this.addOperation(new KnexOperation('orWhereNotExists'), arguments);
  }

  whereIn() {
    return this.addOperation(new KnexOperation('whereIn'), arguments);
  }

  orWhereIn() {
    return this.addOperation(new KnexOperation('orWhereIn'), arguments);
  }

  whereNotIn() {
    return this.addOperation(new KnexOperation('whereNotIn'), arguments);
  }

  orWhereNotIn() {
    return this.addOperation(new KnexOperation('orWhereNotIn'), arguments);
  }

  whereNull() {
    return this.addOperation(new KnexOperation('whereNull'), arguments);
  }

  orWhereNull() {
    return this.addOperation(new KnexOperation('orWhereNull'), arguments);
  }

  whereNotNull() {
    return this.addOperation(new KnexOperation('whereNotNull'), arguments);
  }

  orWhereNotNull() {
    return this.addOperation(new KnexOperation('orWhereNotNull'), arguments);
  }

  whereBetween() {
    return this.addOperation(new KnexOperation('whereBetween'), arguments);
  }

  andWhereBetween() {
    return this.addOperation(new KnexOperation('andWhereBetween'), arguments);
  }

  whereNotBetween() {
    return this.addOperation(new KnexOperation('whereNotBetween'), arguments);
  }

  andWhereNotBetween() {
    return this.addOperation(new KnexOperation('andWhereNotBetween'), arguments);
  }

  orWhereBetween() {
    return this.addOperation(new KnexOperation('orWhereBetween'), arguments);
  }

  orWhereNotBetween() {
    return this.addOperation(new KnexOperation('orWhereNotBetween'), arguments);
  }

  groupBy() {
    return this.addOperation(new KnexOperation('groupBy'), arguments);
  }

  groupByRaw() {
    return this.addOperation(new KnexOperation('groupByRaw'), arguments);
  }

  orderBy() {
    return this.addOperation(new KnexOperation('orderBy'), arguments);
  }

  orderByRaw() {
    return this.addOperation(new KnexOperation('orderByRaw'), arguments);
  }

  union() {
    return this.addOperation(new KnexOperation('union'), arguments);
  }

  unionAll() {
    return this.addOperation(new KnexOperation('unionAll'), arguments);
  }

  having() {
    return this.addOperation(new KnexOperation('having'), arguments);
  }

  orHaving() {
    return this.addOperation(new KnexOperation('orHaving'), arguments);
  }

  havingIn() {
    return this.addOperation(new KnexOperation('havingIn'), arguments);
  }

  orHavingIn() {
    return this.addOperation(new KnexOperation('havingIn'), arguments);
  }

  havingNotIn() {
    return this.addOperation(new KnexOperation('havingNotIn'), arguments);
  }

  orHavingNotIn() {
    return this.addOperation(new KnexOperation('orHavingNotIn'), arguments);
  }

  havingNull() {
    return this.addOperation(new KnexOperation('havingNull'), arguments);
  }

  orHavingNull() {
    return this.addOperation(new KnexOperation('orHavingNull'), arguments);
  }

  havingNotNull() {
    return this.addOperation(new KnexOperation('havingNotNull'), arguments);
  }

  orHavingNotNull() {
    return this.addOperation(new KnexOperation('orHavingNotNull'), arguments);
  }

  havingExists() {
    return this.addOperation(new KnexOperation('havingExists'), arguments);
  }

  orHavingExists() {
    return this.addOperation(new KnexOperation('orHavingExists'), arguments);
  }

  havingNotExists() {
    return this.addOperation(new KnexOperation('havingNotExists'), arguments);
  }

  orHavingNotExists() {
    return this.addOperation(new KnexOperation('orHavingNotExists'), arguments);
  }

  havingBetween() {
    return this.addOperation(new KnexOperation('havingBetween'), arguments);
  }

  orHavingBetween() {
    return this.addOperation(new KnexOperation('havingBetween'), arguments);
  }

  havingNotBetween() {
    return this.addOperation(new KnexOperation('havingNotBetween'), arguments);
  }

  orHavingNotBetween() {
    return this.addOperation(new KnexOperation('havingNotBetween'), arguments);
  }

  havingRaw() {
    return this.addOperation(new KnexOperation('havingRaw'), arguments);
  }

  orHavingRaw() {
    return this.addOperation(new KnexOperation('orHavingRaw'), arguments);
  }

  offset() {
    return this.addOperation(new KnexOperation('offset'), arguments);
  }

  limit() {
    return this.addOperation(new KnexOperation('limit'), arguments);
  }

  count() {
    return this.addOperation(new SelectOperation('count'), arguments);
  }

  countDistinct() {
    return this.addOperation(new SelectOperation('countDistinct'), arguments);
  }

  min() {
    return this.addOperation(new SelectOperation('min'), arguments);
  }

  max() {
    return this.addOperation(new SelectOperation('max'), arguments);
  }

  sum() {
    return this.addOperation(new SelectOperation('sum'), arguments);
  }

  sumDistinct() {
    return this.addOperation(new SelectOperation('sumDistinct'), arguments);
  }

  avg() {
    return this.addOperation(new SelectOperation('avg'), arguments);
  }

  avgDistinct() {
    return this.addOperation(new SelectOperation('avgDistinct'), arguments);
  }

  debug() {
    return this.addOperation(new KnexOperation('debug'), arguments);
  }

  returning() {
    return this.addOperation(new ReturningOperation('returning'), arguments);
  }

  truncate() {
    return this.addOperation(new KnexOperation('truncate'), arguments);
  }

  connection() {
    return this.addOperation(new KnexOperation('connection'), arguments);
  }

  options() {
    return this.addOperation(new KnexOperation('options'), arguments);
  }

  columnInfo() {
    return this.addOperation(new KnexOperation('columnInfo'), arguments);
  }

  off() {
    return this.addOperation(new KnexOperation('off'), arguments);
  }

  timeout() {
    return this.addOperation(new KnexOperation('timeout'), arguments);
  }

  with() {
    return this.addOperation(new KnexOperation('with'), arguments);
  }

  withRaw() {
    return this.addOperation(new KnexOperation('withRaw'), arguments);
  }

  withWrapped() {
    return this.addOperation(new KnexOperation('withWrapped'), arguments);
  }

  whereComposite() {
    return this.addOperation(new WhereCompositeOperation('whereComposite'), arguments);
  }

  whereInComposite() {
    let operation = null;

    if (isSqlite(this.knex())) {
      operation = new WhereInCompositeSqliteOperation('whereInComposite');
    } else if (isMsSql(this.knex())) {
      operation = new WhereInCompositeMsSqlOperation('whereInComposite');
    } else {
      operation = new WhereInCompositeOperation('whereInComposite');
    }

    return this.addOperation(operation, arguments);
  }

  whereNotInComposite() {
    let operation = null;

    if (isSqlite(this.knex())) {
      operation = new WhereInCompositeSqliteOperation('whereNotInComposite', { prefix: 'not' });
    } else if (isMsSql(this.knex())) {
      operation = new WhereInCompositeMsSqlOperation('whereNotInComposite', { prefix: 'not' });
    } else {
      operation = new WhereInCompositeOperation('whereNotInComposite', { prefix: 'not' });
    }

    return this.addOperation(operation, arguments);
  }

  whereJsonSupersetOf() {
    return this.addOperation(
      new WhereJsonPostgresOperation('whereJsonSupersetOf', { operator: '@>', bool: 'and' }),
      arguments
    );
  }

  orWhereJsonSupersetOf() {
    return this.addOperation(
      new WhereJsonPostgresOperation('orWhereJsonSupersetOf', { operator: '@>', bool: 'or' }),
      arguments
    );
  }

  whereJsonNotSupersetOf() {
    return this.addOperation(
      new WhereJsonPostgresOperation('whereJsonNotSupersetOf', {
        operator: '@>',
        bool: 'and',
        prefix: 'not'
      }),
      arguments
    );
  }

  orWhereJsonNotSupersetOf() {
    return this.addOperation(
      new WhereJsonPostgresOperation('orWhereJsonNotSupersetOf', {
        operator: '@>',
        bool: 'or',
        prefix: 'not'
      }),
      arguments
    );
  }

  whereJsonSubsetOf() {
    return this.addOperation(
      new WhereJsonPostgresOperation('whereJsonSubsetOf', { operator: '<@', bool: 'and' }),
      arguments
    );
  }

  orWhereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return this.addOperation(
      new WhereJsonPostgresOperation('orWhereJsonSubsetOf', { operator: '<@', bool: 'or' }),
      arguments
    );
  }

  whereJsonNotSubsetOf() {
    return this.addOperation(
      new WhereJsonPostgresOperation('whereJsonNotSubsetOf', {
        operator: '<@',
        bool: 'and',
        prefix: 'not'
      }),
      arguments
    );
  }

  orWhereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return this.addOperation(
      new WhereJsonPostgresOperation('orWhereJsonNotSubsetOf', {
        operator: '<@',
        bool: 'or',
        prefix: 'not'
      }),
      arguments
    );
  }

  whereJsonNotArray() {
    return this.addOperation(
      new WhereJsonNotObjectPostgresOperation('whereJsonNotArray', {
        bool: 'and',
        compareValue: []
      }),
      arguments
    );
  }

  orWhereJsonNotArray() {
    return this.addOperation(
      new WhereJsonNotObjectPostgresOperation('orWhereJsonNotArray', {
        bool: 'or',
        compareValue: []
      }),
      arguments
    );
  }

  whereJsonNotObject() {
    return this.addOperation(
      new WhereJsonNotObjectPostgresOperation('whereJsonNotObject', {
        bool: 'and',
        compareValue: {}
      }),
      arguments
    );
  }

  orWhereJsonNotObject() {
    return this.addOperation(
      new WhereJsonNotObjectPostgresOperation('orWhereJsonNotObject', {
        bool: 'or',
        compareValue: {}
      }),
      arguments
    );
  }

  whereJsonHasAny() {
    return this.addOperation(
      new WhereJsonHasPostgresOperation('whereJsonHasAny', { bool: 'and', operator: '?|' }),
      arguments
    );
  }

  orWhereJsonHasAny() {
    return this.addOperation(
      new WhereJsonHasPostgresOperation('orWhereJsonHasAny', { bool: 'or', operator: '?|' }),
      arguments
    );
  }

  whereJsonHasAll() {
    return this.addOperation(
      new WhereJsonHasPostgresOperation('whereJsonHasAll', { bool: 'and', operator: '?&' }),
      arguments
    );
  }

  orWhereJsonHasAll() {
    return this.addOperation(
      new WhereJsonHasPostgresOperation('orWhereJsonHasAll', { bool: 'or', operator: '?&' }),
      arguments
    );
  }

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

Object.defineProperties(QueryBuilderBase.prototype, {
  isObjectionQueryBuilderBase: {
    enumerable: false,
    writable: false,
    value: true
  }
});

module.exports = QueryBuilderBase;
