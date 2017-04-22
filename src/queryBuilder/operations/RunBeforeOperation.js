const QueryBuilderOperation = require('./QueryBuilderOperation');

module.exports = class RunBeforeOperation extends QueryBuilderOperation {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onBefore(builder, result) {
    return this.func.call(builder, result, builder);
  }
}
