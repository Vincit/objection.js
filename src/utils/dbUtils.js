import KnexQueryBuilder from 'knex/lib/query/builder'
import JoinClause from 'knex/lib/query/joinclause'

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

export function isKnexQueryBuilder(knexQueryBuilder) {
  return knexQueryBuilder instanceof KnexQueryBuilder;
}

export function isKnexJoinBuilder(knexQueryBuilder) {
  return knexQueryBuilder instanceof JoinClause;
}
