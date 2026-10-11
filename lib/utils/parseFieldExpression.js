'use strict';

const jsonFieldExpressionParser = require('../queryBuilder/parsers/jsonFieldExpressionParser');
const { isObject } = require('./objectUtils');
const cache = new Map();

function parseFieldExpression(expr) {
  let parsedExpr = cache.get(expr);

  if (parsedExpr !== undefined) {
    return parsedExpr;
  } else {
    parsedExpr = jsonFieldExpressionParser.parse(expr);
    parsedExpr = preprocessParsedExpression(parsedExpr);

    // We don't take a copy of the parsedExpr each time we
    // use if from cache. Instead to make sure it's never
    // mutated we deep-freeze it.
    parsedExpr = freezeParsedExpr(parsedExpr);

    cache.set(expr, parsedExpr);
    return parsedExpr;
  }
}

function preprocessParsedExpression(parsedExpr) {
  const columnParts = parsedExpr.columnName.split('.').map((part) => part.trim());
  parsedExpr.column = columnParts[columnParts.length - 1];

  if (columnParts.length >= 2) {
    parsedExpr.table = columnParts.slice(0, columnParts.length - 1).join('.');
  } else {
    parsedExpr.table = null;
  }

  return parsedExpr;
}

function freezeParsedExpr(parsedExpr) {
  for (const access of parsedExpr.access) {
    Object.freeze(access);
  }

  Object.freeze(parsedExpr.access);
  Object.freeze(parsedExpr);

  return parsedExpr;
}

// Keys with a ':' in the data of patches and updates are field expressions like
// `'meta:a.b'` that write into json columns, unless they are `declared`: the
// `properties` of the schema, or an object with their column names as keys.
function isFieldExpressionKey(key, declared) {
  return (
    key.includes(':') &&
    !(isObject(declared) && Object.prototype.hasOwnProperty.call(declared, key))
  );
}

// Formats the json path of a parsed field expression as a Postgres text array
// literal, e.g. `{a,"",b}`. Keys that would otherwise be misread (empty keys,
// keys with whitespace, delimiters, quotes or backslashes and `NULL`) are
// double-quoted, with quotes and backslashes escaped.
function toPostgresJsonPath(access) {
  const keys = access.map(({ ref }) => {
    const key = String(ref);
    return key === '' || /[{}",\\\s]/.test(key) || key.toUpperCase() === 'NULL'
      ? `"${key.replace(/["\\]/g, '\\$&')}"`
      : key;
  });
  return `{${keys.join(',')}}`;
}

// Formats the json path of a parsed field expression as a quoted string literal
// to be used in raw knex SQL, e.g. `'{a,b}'`. The path can't be passed as a
// binding, as knex doesn't keep the order of bindings in raw columns (e.g. in
// `whereIn(ref(...), values)`), so the keys need to be escaped instead: single
// quotes are doubled, and `?` is escaped so that knex doesn't read it as a
// binding placeholder. Backslashes are always doubled by `toPostgresJsonPath()`,
// so they can't escape the closing quote either. But knex's Postgres dialect
// drops all backslashes in front of an escaped `?`, so if the path contains any,
// an escape string literal is used in which backslashes are written as `\134`.
function toPostgresJsonPathLiteral(access) {
  const path = toPostgresJsonPath(access).replace(/'/g, "''");

  if (path.includes('\\?')) {
    return `E'${path.replace(/\\/g, '\\134').replace(/\?/g, '\\?')}'`;
  } else {
    return `'${path.replace(/\?/g, '\\?')}'`;
  }
}

module.exports = {
  parseFieldExpression,
  isFieldExpressionKey,
  toPostgresJsonPath,
  toPostgresJsonPathLiteral,
};
