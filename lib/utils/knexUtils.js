'use strict';

const KnexQueryBuilder = require('knex/lib/query/builder');
const JoinClause = require('knex/lib/query/joinclause');
const KnexRaw = require('knex/lib/raw');

function getDialect(knex) {
  return (knex && knex.client && knex.client.dialect) || null;
}

function isPostgres(knex) {
  return getDialect(knex) === 'postgresql';
}

function isMySql(knex) {
  return getDialect(knex) === 'mysql';
}

function isSqlite(knex) {
  return getDialect(knex) === 'sqlite3';
}

function isMsSql(knex) {
  return getDialect(knex) === 'mssql';
}

function isKnexQueryBuilder(value) {
  return value instanceof KnexQueryBuilder;
}

function isKnexJoinBuilder(value) {
  return value instanceof JoinClause;
}

function isKnexRaw(value) {
  return value instanceof KnexRaw;
}

function isKnexTransaction(knex) {
  return (
    !!getDialect(knex) && typeof knex.commit === 'function' && typeof knex.rollback === 'function'
  );
}

module.exports = {
  getDialect,
  isPostgres,
  isMySql,
  isSqlite,
  isMsSql,
  isKnexQueryBuilder,
  isKnexJoinBuilder,
  isKnexRaw,
  isKnexTransaction
};
