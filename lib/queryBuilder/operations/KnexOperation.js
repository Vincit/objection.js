'use strict';

const WrappingQueryBuilderOperation = require('./WrappingQueryBuilderOperation');

class KnexOperation extends WrappingQueryBuilderOperation {

  onBuildKnex(knexBuilder) {
    knexBuilder[this.name].apply(knexBuilder, this.args);
  }
}

module.exports = KnexOperation;