const QueryBuilderOperation = require('./QueryBuilderOperation');

class OnErrorOperation extends QueryBuilderOperation {
  onAdd(builder, args) {
    this.func = args[0];
    return true;
  }

  onError(builder, error) {
    return this.func.call(builder, error, builder);
  }
}

module.exports = OnErrorOperation;
