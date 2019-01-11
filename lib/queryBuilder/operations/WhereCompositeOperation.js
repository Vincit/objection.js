'use strict';

const { ObjectionToKnexConvertingOperation } = require('./ObjectionToKnexConvertingOperation');
const { asSingle } = require('../../utils/objectUtils');

class WhereCompositeOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    const args = this.getKnexArgs(builder);

    if (args.length === 2) {
      build(knexBuilder, args[0], '=', args[1]);
    } else if (args.length === 3) {
      build(knexBuilder, ...args);
    } else {
      throw new Error(`invalid number of arguments ${args.length}`);
    }
  }
}

function build(knexBuilder, cols, op, values) {
  if (isNormalWhere(cols, values)) {
    buildNormalWhere(knexBuilder, cols, op, values);
  } else if (isCompositeWhere(cols, values)) {
    buildCompositeWhere(knexBuilder, cols, op, values);
  } else {
    throw new Error(`both cols and values must have same dimensions`);
  }
}

function isNormalWhere(cols, values) {
  return (
    (!Array.isArray(cols) || cols.length === 1) && (!Array.isArray(values) || values.length === 1)
  );
}

function buildNormalWhere(knexBuilder, cols, op, values) {
  knexBuilder.where(asSingle(cols), op, asSingle(values));
}

function isCompositeWhere(cols, values) {
  return Array.isArray(cols) && Array.isArray(values) && cols.length === values.length;
}

function buildCompositeWhere(knexBuilder, cols, op, values) {
  knexBuilder.where(builder => {
    for (let i = 0, l = cols.length; i < l; ++i) {
      builder.where(cols[i], op, values[i]);
    }
  });
}

module.exports = {
  WhereCompositeOperation
};
