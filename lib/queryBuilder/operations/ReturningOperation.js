'use strict';

const { flatten } = require('../../utils/objectUtils');
const { ObjectionToKnexConvertingOperation } = require('./ObjectionToKnexConvertingOperation');

// This class's only purpose is to normalize the arguments into an array.
//
// In knex, if a single column is given to `returning` it returns an array with the that column's value
// in it. If an array is given with a one item inside, the return value is an object.
class ReturningOperation extends ObjectionToKnexConvertingOperation {
  onAdd(builder, args) {
    args = flatten(args);

    // Don't add an empty returning list.
    if (args.length === 0) {
      return false;
    }

    return super.onAdd(builder, args);
  }

  onBuildKnex(knexBuilder, builder) {
    // Always pass an array of columns to knex.returning.
    return knexBuilder.returning(this.getKnexArgs(builder));
  }
}

module.exports = {
  ReturningOperation,
};
