'use strict';

const { ValidationErrorType } = require('../../model/ValidationError');
const { isPostgres, isMySql, isMsSql, isSqlite } = require('../../utils/knexUtils');

const RELATION_RECURSION_LIMIT = 64;

// The maximum length of the column aliases of the joined relations, after
// which the database would truncate them. Other databases keep the limit of
// postgres, which isn't the strictest one: Oracle before 12.2 only allows 30.
function getIdentifierLengthLimit(knex) {
  if (isPostgres(knex)) {
    return 63;
  } else if (isMySql(knex)) {
    return 256;
  } else if (isMsSql(knex)) {
    return 128;
  } else if (isSqlite(knex)) {
    return Infinity;
  } else {
    return 63;
  }
}

// Given a relation expression, goes through all first level children.
function forEachChildExpression(expr, modelClass, callback) {
  if (expr.node.$allRecursive || expr.maxRecursionDepth > RELATION_RECURSION_LIMIT) {
    throw modelClass.createValidationError({
      type: ValidationErrorType.RelationExpression,
      message: `recursion depth of eager expression ${expr.toString()} too big for JoinEagerAlgorithm`,
    });
  }

  expr.forEachChildExpression(modelClass, callback);
}

module.exports = {
  RELATION_RECURSION_LIMIT,

  getIdentifierLengthLimit,

  forEachChildExpression,
};
