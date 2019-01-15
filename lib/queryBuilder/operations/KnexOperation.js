'use strict';

const { ObjectionToKnexConvertingOperation } = require('./ObjectionToKnexConvertingOperation');

// An operation that simply calls the equivalent knex method.
class KnexOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    knexBuilder[this.name].apply(knexBuilder, this.getKnexArgs(builder));
  }
}

module.exports = {
  KnexOperation
};
