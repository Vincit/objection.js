'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');
const RangeOperation = require('./RangeOperation');

class RunAfterOperation extends QueryBuilderOperation {
  onAdd(builder, args) {
    this.func = args[0];
    return true;
  }

  onAfter3(builder, result) {
    // If there is a RangeOperation before the RunAfterOperation, take the nesting of the
    // result array inside the result object into account: `{ result: [...], total: ... }`
    if (result && builder.hasOperationBefore(this, RangeOperation)) {
      result.result = this.func.call(builder, result.result, builder);
      return result;
    } else {
      return this.func.call(builder, result, builder);
    }
  }
}

module.exports = RunAfterOperation;
