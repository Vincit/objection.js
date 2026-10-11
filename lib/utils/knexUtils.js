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

// MySQL supports window functions since 8.0, MariaDB since 10.2. Without a
// version, knex assumes the latest one, and so do we.
function hasWindowFunctions(knex) {
  const { version, isMariaDB } = knex.client;

  if (isMySql(knex) && version) {
    const [major, minor] = version.split('.').map(Number);
    return isMariaDB ? major > 10 || (major === 10 && minor >= 2) : major >= 8;
  } else {
    return true;
  }
}

function isKnexQueryBuilder(value) {
  return (
    hasConstructor(value) &&
    isFunction(value.select) &&
    isFunction(value.column) &&
    value.select === value.column &&
    'client' in value
  );
}

function isKnexJoinBuilder(value) {
  return hasConstructor(value) && value.grouping === 'join' && 'joinType' in value;
}

function isKnexRaw(value) {
  return hasConstructor(value) && value.isRawInstance && 'client' in value;
}

function isKnexTransaction(knex) {
  return !!getDialect(knex) && isFunction(knex.commit) && isFunction(knex.rollback);
}

function hasConstructor(value) {
  return isObject(value) && isFunction(value.constructor);
}

module.exports = {
  getDialect,
  isPostgres,
  isMySql,
  isSqlite,
  isMsSql,
  isOracle,
  hasWindowFunctions,
  isKnexQueryBuilder,
  isKnexJoinBuilder,
  isKnexRaw,
  isKnexTransaction,
};
