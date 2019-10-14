'use strict';

const { QueryBuilderOperationSupport } = require('./QueryBuilderOperationSupport');
const { isSqlite, isMsSql } = require('../utils/knexUtils');

const { KnexOperation } = require('./operations/KnexOperation');
const { SelectOperation } = require('./operations/select/SelectOperation');
const { ReturningOperation } = require('./operations/ReturningOperation');
const { WhereCompositeOperation } = require('./operations/WhereCompositeOperation');
const { WhereJsonPostgresOperation } = require('./operations/jsonApi/WhereJsonPostgresOperation');

const {
  WhereInCompositeOperation
} = require('./operations/whereInComposite/WhereInCompositeOperation');
const {
  WhereInCompositeSqliteOperation
} = require('./operations/whereInComposite/WhereInCompositeSqliteOperation');
const {
  WhereInCompositeMsSqlOperation
} = require('./operations/whereInComposite/WhereInCompositeMsSqlOperation');
const {
  WhereJsonHasPostgresOperation
} = require('./operations/jsonApi/WhereJsonHasPostgresOperation');
const {
  WhereJsonNotObjectPostgresOperation
} = require('./operations/jsonApi/WhereJsonNotObjectPostgresOperation');

class QueryBuilderBase extends QueryBuilderOperationSupport {
  modify(...args) {
    const func = args[0];

    if (!func) {
      return this;
    }

    if (args.length === 1) {
      func.call(this, this);
    } else {
      args[0] = this;
      func(...args);
    }

    return this;
  }

  transacting(trx) {
    this._context.knex = trx || null;
    return this;
  }

  select(...args) {
    return this.addOperation(new SelectOperation('select'), args);
  }

  insert(...args) {
    return this.addOperation(new KnexOperation('insert'), args);
  }

  update(...args) {
    return this.addOperation(new KnexOperation('update'), args);
  }

  delete(...args) {
    return this.addOperation(new KnexOperation('delete'), args);
  }

  del(...args) {
    return this.delete(...args);
  }

  forUpdate(...args) {
    return this.addOperation(new KnexOperation('forUpdate'), args);
  }

  forShare(...args) {
    return this.addOperation(new KnexOperation('forShare'), args);
  }

  as(...args) {
    return this.addOperation(new KnexOperation('as'), args);
  }

  columns(...args) {
    return this.addOperation(new SelectOperation('columns'), args);
  }

  column(...args) {
    return this.addOperation(new SelectOperation('column'), args);
  }

  from(...args) {
    return this.addOperation(new KnexOperation('from'), args);
  }

  fromJS(...args) {
    return this.addOperation(new KnexOperation('fromJS'), args);
  }

  into(...args) {
    return this.addOperation(new KnexOperation('into'), args);
  }

  withSchema(...args) {
    return this.addOperation(new KnexOperation('withSchema'), args);
  }

  table(...args) {
    return this.addOperation(new KnexOperation('table'), args);
  }

  distinct(...args) {
    return this.addOperation(new SelectOperation('distinct'), args);
  }

  join(...args) {
    return this.addOperation(new KnexOperation('join'), args);
  }

  joinRaw(...args) {
    return this.addOperation(new KnexOperation('joinRaw'), args);
  }

  innerJoin(...args) {
    return this.addOperation(new KnexOperation('innerJoin'), args);
  }

  leftJoin(...args) {
    return this.addOperation(new KnexOperation('leftJoin'), args);
  }

  leftOuterJoin(...args) {
    return this.addOperation(new KnexOperation('leftOuterJoin'), args);
  }

  rightJoin(...args) {
    return this.addOperation(new KnexOperation('rightJoin'), args);
  }

  rightOuterJoin(...args) {
    return this.addOperation(new KnexOperation('rightOuterJoin'), args);
  }

  outerJoin(...args) {
    return this.addOperation(new KnexOperation('outerJoin'), args);
  }

  fullOuterJoin(...args) {
    return this.addOperation(new KnexOperation('fullOuterJoin'), args);
  }

  crossJoin(...args) {
    return this.addOperation(new KnexOperation('crossJoin'), args);
  }

  where(...args) {
    return this.addOperation(new KnexOperation('where'), args);
  }

  andWhere(...args) {
    return this.addOperation(new KnexOperation('andWhere'), args);
  }

  orWhere(...args) {
    return this.addOperation(new KnexOperation('orWhere'), args);
  }

  whereNot(...args) {
    return this.addOperation(new KnexOperation('whereNot'), args);
  }

  orWhereNot(...args) {
    return this.addOperation(new KnexOperation('orWhereNot'), args);
  }

  whereRaw(...args) {
    return this.addOperation(new KnexOperation('whereRaw'), args);
  }

  andWhereRaw(...args) {
    return this.addOperation(new KnexOperation('andWhereRaw'), args);
  }

  orWhereRaw(...args) {
    return this.addOperation(new KnexOperation('orWhereRaw'), args);
  }

  whereWrapped(...args) {
    return this.addOperation(new KnexOperation('whereWrapped'), args);
  }

  havingWrapped(...args) {
    return this.addOperation(new KnexOperation('havingWrapped'), args);
  }

  whereExists(...args) {
    return this.addOperation(new KnexOperation('whereExists'), args);
  }

  orWhereExists(...args) {
    return this.addOperation(new KnexOperation('orWhereExists'), args);
  }

  whereNotExists(...args) {
    return this.addOperation(new KnexOperation('whereNotExists'), args);
  }

  orWhereNotExists(...args) {
    return this.addOperation(new KnexOperation('orWhereNotExists'), args);
  }

  whereIn(...args) {
    return this.addOperation(new KnexOperation('whereIn'), args);
  }

  orWhereIn(...args) {
    return this.addOperation(new KnexOperation('orWhereIn'), args);
  }

  whereNotIn(...args) {
    return this.addOperation(new KnexOperation('whereNotIn'), args);
  }

  orWhereNotIn(...args) {
    return this.addOperation(new KnexOperation('orWhereNotIn'), args);
  }

  whereNull(...args) {
    return this.addOperation(new KnexOperation('whereNull'), args);
  }

  orWhereNull(...args) {
    return this.addOperation(new KnexOperation('orWhereNull'), args);
  }

  whereNotNull(...args) {
    return this.addOperation(new KnexOperation('whereNotNull'), args);
  }

  orWhereNotNull(...args) {
    return this.addOperation(new KnexOperation('orWhereNotNull'), args);
  }

  whereBetween(...args) {
    return this.addOperation(new KnexOperation('whereBetween'), args);
  }

  andWhereBetween(...args) {
    return this.addOperation(new KnexOperation('andWhereBetween'), args);
  }

  whereNotBetween(...args) {
    return this.addOperation(new KnexOperation('whereNotBetween'), args);
  }

  andWhereNotBetween(...args) {
    return this.addOperation(new KnexOperation('andWhereNotBetween'), args);
  }

  orWhereBetween(...args) {
    return this.addOperation(new KnexOperation('orWhereBetween'), args);
  }

  orWhereNotBetween(...args) {
    return this.addOperation(new KnexOperation('orWhereNotBetween'), args);
  }

  groupBy(...args) {
    return this.addOperation(new KnexOperation('groupBy'), args);
  }

  groupByRaw(...args) {
    return this.addOperation(new KnexOperation('groupByRaw'), args);
  }

  orderBy(...args) {
    return this.addOperation(new KnexOperation('orderBy'), args);
  }

  orderByRaw(...args) {
    return this.addOperation(new KnexOperation('orderByRaw'), args);
  }

  union(...args) {
    return this.addOperation(new KnexOperation('union'), args);
  }

  unionAll(...args) {
    return this.addOperation(new KnexOperation('unionAll'), args);
  }

  intersect(...args) {
    return this.addOperation(new KnexOperation('intersect'), args);
  }

  having(...args) {
    return this.addOperation(new KnexOperation('having'), args);
  }

  clearHaving(...args) {
    return this.addOperation(new KnexOperation('clearHaving'), args);
  }

  orHaving(...args) {
    return this.addOperation(new KnexOperation('orHaving'), args);
  }

  havingIn(...args) {
    return this.addOperation(new KnexOperation('havingIn'), args);
  }

  orHavingIn(...args) {
    return this.addOperation(new KnexOperation('havingIn'), args);
  }

  havingNotIn(...args) {
    return this.addOperation(new KnexOperation('havingNotIn'), args);
  }

  orHavingNotIn(...args) {
    return this.addOperation(new KnexOperation('orHavingNotIn'), args);
  }

  havingNull(...args) {
    return this.addOperation(new KnexOperation('havingNull'), args);
  }

  orHavingNull(...args) {
    return this.addOperation(new KnexOperation('orHavingNull'), args);
  }

  havingNotNull(...args) {
    return this.addOperation(new KnexOperation('havingNotNull'), args);
  }

  orHavingNotNull(...args) {
    return this.addOperation(new KnexOperation('orHavingNotNull'), args);
  }

  havingExists(...args) {
    return this.addOperation(new KnexOperation('havingExists'), args);
  }

  orHavingExists(...args) {
    return this.addOperation(new KnexOperation('orHavingExists'), args);
  }

  havingNotExists(...args) {
    return this.addOperation(new KnexOperation('havingNotExists'), args);
  }

  orHavingNotExists(...args) {
    return this.addOperation(new KnexOperation('orHavingNotExists'), args);
  }

  havingBetween(...args) {
    return this.addOperation(new KnexOperation('havingBetween'), args);
  }

  orHavingBetween(...args) {
    return this.addOperation(new KnexOperation('havingBetween'), args);
  }

  havingNotBetween(...args) {
    return this.addOperation(new KnexOperation('havingNotBetween'), args);
  }

  orHavingNotBetween(...args) {
    return this.addOperation(new KnexOperation('havingNotBetween'), args);
  }

  havingRaw(...args) {
    return this.addOperation(new KnexOperation('havingRaw'), args);
  }

  orHavingRaw(...args) {
    return this.addOperation(new KnexOperation('orHavingRaw'), args);
  }

  offset(...args) {
    return this.addOperation(new KnexOperation('offset'), args);
  }

  limit(...args) {
    return this.addOperation(new KnexOperation('limit'), args);
  }

  count(...args) {
    return this.addOperation(new SelectOperation('count'), args);
  }

  countDistinct(...args) {
    return this.addOperation(new SelectOperation('countDistinct'), args);
  }

  min(...args) {
    return this.addOperation(new SelectOperation('min'), args);
  }

  max(...args) {
    return this.addOperation(new SelectOperation('max'), args);
  }

  sum(...args) {
    return this.addOperation(new SelectOperation('sum'), args);
  }

  sumDistinct(...args) {
    return this.addOperation(new SelectOperation('sumDistinct'), args);
  }

  avg(...args) {
    return this.addOperation(new SelectOperation('avg'), args);
  }

  avgDistinct(...args) {
    return this.addOperation(new SelectOperation('avgDistinct'), args);
  }

  debug(...args) {
    return this.addOperation(new KnexOperation('debug'), args);
  }

  returning(...args) {
    return this.addOperation(new ReturningOperation('returning'), args);
  }

  truncate(...args) {
    return this.addOperation(new KnexOperation('truncate'), args);
  }

  connection(...args) {
    return this.addOperation(new KnexOperation('connection'), args);
  }

  options(...args) {
    return this.addOperation(new KnexOperation('options'), args);
  }

  columnInfo(...args) {
    return this.addOperation(new KnexOperation('columnInfo'), args);
  }

  off(...args) {
    return this.addOperation(new KnexOperation('off'), args);
  }

  timeout(...args) {
    return this.addOperation(new KnexOperation('timeout'), args);
  }

  with(...args) {
    return this.addOperation(new KnexOperation('with'), args);
  }

  withRaw(...args) {
    return this.addOperation(new KnexOperation('withRaw'), args);
  }

  withWrapped(...args) {
    return this.addOperation(new KnexOperation('withWrapped'), args);
  }

  withRecursive(...args) {
    return this.addOperation(new KnexOperation('withRecursive'), args);
  }

  whereComposite(...args) {
    return this.addOperation(new WhereCompositeOperation('whereComposite'), args);
  }

  whereInComposite(...args) {
    let operation = null;

    if (isSqlite(this.knex())) {
      operation = new WhereInCompositeSqliteOperation('whereInComposite');
    } else if (isMsSql(this.knex())) {
      operation = new WhereInCompositeMsSqlOperation('whereInComposite');
    } else {
      operation = new WhereInCompositeOperation('whereInComposite');
    }

    return this.addOperation(operation, args);
  }

  whereNotInComposite(...args) {
    let operation = null;

    if (isSqlite(this.knex())) {
      operation = new WhereInCompositeSqliteOperation('whereNotInComposite', { prefix: 'not' });
    } else if (isMsSql(this.knex())) {
      operation = new WhereInCompositeMsSqlOperation('whereNotInComposite', { prefix: 'not' });
    } else {
      operation = new WhereInCompositeOperation('whereNotInComposite', { prefix: 'not' });
    }

    return this.addOperation(operation, args);
  }

  whereJsonSupersetOf(...args) {
    return this.addOperation(
      new WhereJsonPostgresOperation('whereJsonSupersetOf', { operator: '@>', bool: 'and' }),
      args
    );
  }

  orWhereJsonSupersetOf(...args) {
    return this.addOperation(
      new WhereJsonPostgresOperation('orWhereJsonSupersetOf', { operator: '@>', bool: 'or' }),
      args
    );
  }

  whereJsonNotSupersetOf(...args) {
    return this.addOperation(
      new WhereJsonPostgresOperation('whereJsonNotSupersetOf', {
        operator: '@>',
        bool: 'and',
        prefix: 'not'
      }),
      args
    );
  }

  orWhereJsonNotSupersetOf(...args) {
    return this.addOperation(
      new WhereJsonPostgresOperation('orWhereJsonNotSupersetOf', {
        operator: '@>',
        bool: 'or',
        prefix: 'not'
      }),
      args
    );
  }

  whereJsonSubsetOf(...args) {
    return this.addOperation(
      new WhereJsonPostgresOperation('whereJsonSubsetOf', { operator: '<@', bool: 'and' }),
      args
    );
  }

  orWhereJsonSubsetOf(...args) {
    return this.addOperation(
      new WhereJsonPostgresOperation('orWhereJsonSubsetOf', { operator: '<@', bool: 'or' }),
      args
    );
  }

  whereJsonNotSubsetOf(...args) {
    return this.addOperation(
      new WhereJsonPostgresOperation('whereJsonNotSubsetOf', {
        operator: '<@',
        bool: 'and',
        prefix: 'not'
      }),
      args
    );
  }

  orWhereJsonNotSubsetOf(...args) {
    return this.addOperation(
      new WhereJsonPostgresOperation('orWhereJsonNotSubsetOf', {
        operator: '<@',
        bool: 'or',
        prefix: 'not'
      }),
      args
    );
  }

  whereJsonNotArray(...args) {
    return this.addOperation(
      new WhereJsonNotObjectPostgresOperation('whereJsonNotArray', {
        bool: 'and',
        compareValue: []
      }),
      args
    );
  }

  orWhereJsonNotArray(...args) {
    return this.addOperation(
      new WhereJsonNotObjectPostgresOperation('orWhereJsonNotArray', {
        bool: 'or',
        compareValue: []
      }),
      args
    );
  }

  whereJsonNotObject(...args) {
    return this.addOperation(
      new WhereJsonNotObjectPostgresOperation('whereJsonNotObject', {
        bool: 'and',
        compareValue: {}
      }),
      args
    );
  }

  orWhereJsonNotObject(...args) {
    return this.addOperation(
      new WhereJsonNotObjectPostgresOperation('orWhereJsonNotObject', {
        bool: 'or',
        compareValue: {}
      }),
      args
    );
  }

  whereJsonHasAny(...args) {
    return this.addOperation(
      new WhereJsonHasPostgresOperation('whereJsonHasAny', { bool: 'and', operator: '?|' }),
      args
    );
  }

  orWhereJsonHasAny(...args) {
    return this.addOperation(
      new WhereJsonHasPostgresOperation('orWhereJsonHasAny', { bool: 'or', operator: '?|' }),
      args
    );
  }

  whereJsonHasAll(...args) {
    return this.addOperation(
      new WhereJsonHasPostgresOperation('whereJsonHasAll', { bool: 'and', operator: '?&' }),
      args
    );
  }

  orWhereJsonHasAll(...args) {
    return this.addOperation(
      new WhereJsonHasPostgresOperation('orWhereJsonHasAll', { bool: 'or', operator: '?&' }),
      args
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

  whereColumn(...args) {
    return this.addOperation(new KnexOperation('whereColumn'), args);
  }

  andWhereColumn(...args) {
    return this.addOperation(new KnexOperation('andWhereColumn'), args);
  }

  orWhereColumn(...args) {
    return this.addOperation(new KnexOperation('orWhereColumn'), args);
  }

  whereNotColumn(...args) {
    return this.addOperation(new KnexOperation('whereNotColumn'), args);
  }

  andWhereNotColumn(...args) {
    return this.addOperation(new KnexOperation('andWhereNotColumn'), args);
  }

  orWhereNotColumn(...args) {
    return this.addOperation(new KnexOperation('orWhereNotColumn'), args);
  }
}

Object.defineProperties(QueryBuilderBase.prototype, {
  isObjectionQueryBuilderBase: {
    enumerable: false,
    writable: false,
    value: true
  }
});

module.exports = {
  QueryBuilderBase
};
