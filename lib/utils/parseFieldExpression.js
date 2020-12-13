'use strict';

const jsonFieldExpressionParser = require('../queryBuilder/parsers/jsonFieldExpressionParser');
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

module.exports = {
  parseFieldExpression,
};
