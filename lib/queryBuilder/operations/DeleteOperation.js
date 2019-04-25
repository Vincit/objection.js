'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { after, afterReturn } = require('../../utils/promiseUtils');
const { StaticHookArguments } = require('../StaticHookArguments');

class DeleteOperation extends QueryBuilderOperation {
  onBefore2(builder, result) {
    const maybePromise = callBeforeDelete(builder);
    return afterReturn(maybePromise, result);
  }

  onBuildKnex(knexBuilder) {
    knexBuilder.delete();
  }

  onAfter2(builder, result) {
    return callAfterDelete(builder, result);
  }
}

function callBeforeDelete(builder) {
  return callStaticBeforeDelete(builder);
}

function callStaticBeforeDelete(builder) {
  const args = StaticHookArguments.create({ builder });
  return builder.modelClass().beforeDelete(args);
}

function callAfterDelete(builder, result) {
  return callStaticAfterDelete(builder, result);
}

function callStaticAfterDelete(builder, result) {
  const args = StaticHookArguments.create({ builder, result });
  const maybePromise = builder.modelClass().afterDelete(args);

  return after(maybePromise, maybeResult => {
    if (maybeResult === undefined) {
      return result;
    } else {
      return maybeResult;
    }
  });
}

module.exports = {
  DeleteOperation
};
