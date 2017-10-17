'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');

class RangeOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.resultSizePromise = null;
  }

  onAdd(builder, args) {
    if (args.length === 2) {
      const start = args[0];
      const end = args[1];

      // Need to set these here instead of `onBuildKnex` so that they
      // don't end up in the resultSize query.
      builder.limit(end - start + 1).offset(start);
    }

    return true;
  }

  onBefore1(builder) {
    // Don't return the promise so that it is executed
    // in parallel with the actual query.
    this.resultSizePromise = builder.resultSize().reflect();
    return null;
  }

  onAfter3(builder, result) {
    return this.resultSizePromise.then(res => {
      if (res.isFulfilled()) {
        return {
          results: result,
          total: parseInt(res.value(), 10)
        };
      } else {
        return Promise.reject(res.reason());
      }
    });
  }
}

module.exports = RangeOperation;
