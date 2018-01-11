const QueryBuilderOperation = require('./QueryBuilderOperation');

class FirstOperation extends QueryBuilderOperation {
  onBuildKnex(knexBuilder, builder) {
    const modelClass = builder.modelClass();

    if (modelClass.useLimitInFirst) {
      knexBuilder.limit(1);
    }
  }

  onAfter3(builder, result) {
    if (Array.isArray(result)) {
      return result[0];
    } else {
      return result;
    }
  }
}

module.exports = FirstOperation;
