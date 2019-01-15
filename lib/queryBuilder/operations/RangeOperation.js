'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');

class RangeOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.resultSizeBuilder = null;
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

  onBefore1(builder, result) {
    this.resultSizeBuilder = builder.clone();
    return super.onBefore1(builder, result);
  }

  onAfter3(_, results) {
    return this.resultSizeBuilder.resultSize().then(resultSize => {
      return {
        results,
        total: parseInt(resultSize, 10)
      };
    });
  }

  clone() {
    const clone = super.clone();
    clone.resultSizeBuilder = this.resultSizeBuilder;
    return clone;
  }
}

module.exports = {
  RangeOperation
};
