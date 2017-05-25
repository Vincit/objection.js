'use strict';

const WrappingQueryBuilderOperation = require('./WrappingQueryBuilderOperation');

class KnexOperation extends WrappingQueryBuilderOperation {

  onBuild(builder) {
    builder[this.name].apply(builder, this.args);
  }
}

module.exports = KnexOperation;