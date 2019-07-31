'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { StaticHookArguments } = require('../StaticHookArguments');

class DeleteOperation extends QueryBuilderOperation {
  async onBefore2(builder, result) {
    await callBeforeDelete(builder);
    return result;
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

async function callStaticAfterDelete(builder, result) {
  const args = StaticHookArguments.create({ builder, result });
  const maybeResult = await builder.modelClass().afterDelete(args);

  if (maybeResult === undefined) {
    return result;
  } else {
    return maybeResult;
  }
}

module.exports = {
  DeleteOperation
};
