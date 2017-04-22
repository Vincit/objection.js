const QueryBuilderOperation = require('./QueryBuilderOperation');

module.exports = class RunAfterOperation extends QueryBuilderOperation {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onAfter(builder, result) {
    return this.func.call(builder, result, builder);
  }
}
