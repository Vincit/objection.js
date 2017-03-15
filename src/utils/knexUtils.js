import KnexQueryBuilder from 'knex/lib/query/builder'
import JoinClause from 'knex/lib/query/joinclause'
import KnexRaw from 'knex/lib/raw';

export function getDialect(knex) {
  return (knex && knex.client && knex.client.dialect) || null;
}

export function isPostgres(knex) {
  return getDialect(knex) === 'postgresql';
}

export function isMySql(knex) {
  return getDialect(knex) === 'mysql';
}

export function isSqlite(knex) {
  return getDialect(knex) === 'sqlite3';
}

export function isMsSql(knex) {
  return getDialect(knex) === 'mssql';
}

export function isKnexQueryBuilder(value) {
  return value instanceof KnexQueryBuilder;
}

export function isKnexJoinBuilder(value) {
  return value instanceof JoinClause;
}

export function isKnexRaw(value) {
  return value instanceof KnexRaw;
}

export function isKnexTransaction(knex) {
  return !!getDialect(knex) && typeof knex.commit === 'function' && typeof knex.rollback === 'function';
}
