'use strict';

const { ValidationErrorType } = require('../../model/ValidationError');

const ID_LENGTH_LIMIT = 63;
const RELATION_RECURSION_LIMIT = 64;

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
  ID_LENGTH_LIMIT,
  RELATION_RECURSION_LIMIT,

  forEachChildExpression,
};
