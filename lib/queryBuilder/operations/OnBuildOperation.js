const QueryBuilderOperation = require('./QueryBuilderOperation');

class OnBuildOperation extends QueryBuilderOperation {
  onAdd(builder, args) {
    this.func = args[0];
    return true;
  }

  onBuild(builder) {
    return this.func.call(builder, builder);
  }
}

module.exports = OnBuildOperation;
