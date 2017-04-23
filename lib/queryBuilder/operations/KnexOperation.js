'use strict';

const WrappingQueryBuilderOperation = require('./WrappingQueryBuilderOperation');

class KnexOperation extends WrappingQueryBuilderOperation {

  onBuild(builder) {
    if (typeof builder[this.name] === 'function') {
      builder[this.name].apply(builder, this.args);
    } else {
      throw new Error(`knex doesn't have the method '${this.name}'`);
    }
  }
}

module.exports = KnexOperation;