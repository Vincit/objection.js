'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');

class FirstOperation extends QueryBuilderOperation {
  shouldLimit(builder) {
    return builder.isFind() && builder.modelClass().useLimitInFirst;
  }

  onBuildKnex(knexBuilder, builder) {
    if (this.shouldLimit(builder)) {
      knexBuilder = knexBuilder.limit(1);
    }

    return knexBuilder;
  }

  onAfter3(_, result) {
    if (Array.isArray(result)) {
      return result[0];
    } else {
      return result;
    }
  }
}

module.exports = {
  FirstOperation,
};
