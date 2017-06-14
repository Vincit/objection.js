'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');

class RunAfterOperation extends QueryBuilderOperation {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onAfter3(builder, result) {
    return this.func.call(builder, result, builder);
  }
}

module.exports = RunAfterOperation;
