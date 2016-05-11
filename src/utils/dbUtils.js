import _ from 'lodash';

export function getDialect(knex) {
  return knex.client.dialect;
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
  // TODO: Use something safer
  return knexQueryBuilder
    && knexQueryBuilder.client
    && _.isString(knexQueryBuilder.client.dialect);
}
