const QueryBuilderOperation = require('./QueryBuilderOperation');

module.exports = class OnBuildOperation extends QueryBuilderOperation {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onBeforeBuild(builder) {
    return this.func.call(builder, builder);
  }
}
