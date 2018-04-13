const QueryBuilderOperation = require('./QueryBuilderOperation');

class OnBuildKnexOperation extends QueryBuilderOperation {
  onAdd(builder, args) {
    this.func = args[0];
    return true;
  }

  onBuildKnex(knexBuilder, builder) {
    return this.func.call(knexBuilder, knexBuilder, builder);
  }
}

module.exports = OnBuildKnexOperation;
