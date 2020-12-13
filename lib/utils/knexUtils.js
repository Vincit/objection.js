'use strict';

const { isObject, isFunction } = require('../utils/objectUtils');

function getDialect(knex) {
  const type = typeof knex;

  return (
    (knex !== null &&
      (type === 'object' || type === 'function') &&
      knex.client &&
      knex.client.dialect) ||
    null
  );
}

function isPostgres(knex) {
  return getDialect(knex) === 'postgresql';
}

function isOracle(knex) {
  const dialect = getDialect(knex);
  return dialect === 'oracle' || dialect === 'oracledb';
}

function isMySql(knex) {
  const dialect = getDialect(knex);
  return dialect === 'mysql' || dialect === 'mysql2';
}

function isSqlite(knex) {
  return getDialect(knex) === 'sqlite3';
}

function isMsSql(knex) {
  return getDialect(knex) === 'mssql';
}

function isKnexQueryBuilder(value) {
  return hasConstructor(value, 'Builder') && 'client' in value;
}

function isKnexJoinBuilder(value) {
  return hasConstructor(value, 'JoinClause') && 'joinType' in value;
}

function isKnexRaw(value) {
  return hasConstructor(value, 'Raw') && 'client' in value;
}

function isKnexTransaction(knex) {
  return !!getDialect(knex) && isFunction(knex.commit) && isFunction(knex.rollback);
}

function hasConstructor(value, constructorName) {
  return (
    isObject(value) && isFunction(value.constructor) && value.constructor.name === constructorName
  );
}

module.exports = {
  getDialect,
  isPostgres,
  isMySql,
  isSqlite,
  isMsSql,
  isOracle,
  isKnexQueryBuilder,
  isKnexJoinBuilder,
  isKnexRaw,
  isKnexTransaction,
};
