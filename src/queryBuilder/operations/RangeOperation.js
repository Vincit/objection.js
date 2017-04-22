const QueryBuilderOperation = require('./QueryBuilderOperation');

module.exports = class RangeOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.resultSizePromise = null;
  }

  call(builder, args) {
    if (args.length === 2) {
      const start = args[0];
      const end = args[1];

      // Need to set these here instead of `onBuild` so that they
      // don't end up in the resultSize query.
      builder.limit(end - start + 1).offset(start);
    }

    return true;
  }

  onBefore(builder) {
    // Don't return the promise so that it is executed
    // in parallel with the actual query.
    this.resultSizePromise = builder.resultSize();
    return null;
  }

  onAfter(builder, result) {
    return this.resultSizePromise.then(count => {
      return {
        results: result,
        total: parseInt(count, 10)
      };
    });
  }
}
