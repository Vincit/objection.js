const ObjectionToKnexConvertingOperation = require('./ObjectionToKnexConvertingOperation');

// An operation that simply calls the equivalent knex method.
class KnexOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder) {
    knexBuilder[this.name].apply(knexBuilder, this.args);
  }
}

module.exports = KnexOperation;
