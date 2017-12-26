const QueryBuilderOperation = require('./QueryBuilderOperation');

class RunBeforeOperation extends QueryBuilderOperation {
  onAdd(builder, args) {
    this.func = args[0];
    return true;
  }

  onBefore1(builder, result) {
    return this.func.call(builder, result, builder);
  }
}

module.exports = RunBeforeOperation;
