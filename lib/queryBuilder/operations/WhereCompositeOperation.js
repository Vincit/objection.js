'use strict';

const { ObjectionToKnexConvertingOperation } = require('./ObjectionToKnexConvertingOperation');
const { asSingle } = require('../../utils/objectUtils');

class WhereCompositeOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    const args = this.getKnexArgs(builder);

    if (args.length === 2) {
      // Convert whereComposite('foo', 1) into whereComposite('foo', '=', 1)
      args.splice(1, 0, '=');
    } else if (args.length !== 3) {
      throw new Error(`invalid number of arguments ${args.length}`);
    }

    return knexBuilder.where(...buildWhereArgs(...args));
  }
}

function buildWhereArgs(cols, op, values) {
  if (isNormalWhere(cols, values)) {
    return buildNormalWhereArgs(cols, op, values);
  } else if (isCompositeWhere(cols, values)) {
    return buildCompositeWhereArgs(cols, op, values);
  } else {
    throw new Error(`both cols and values must have same dimensions`);
  }
}

function isNormalWhere(cols, values) {
  return (
    (!Array.isArray(cols) || cols.length === 1) && (!Array.isArray(values) || values.length === 1)
  );
}

function buildNormalWhereArgs(cols, op, values) {
  return [asSingle(cols), op, asSingle(values)];
}

function isCompositeWhere(cols, values) {
  return Array.isArray(cols) && Array.isArray(values) && cols.length === values.length;
}

function buildCompositeWhereArgs(cols, op, values) {
  return [
    (builder) => {
      for (let i = 0, l = cols.length; i < l; ++i) {
        builder.where(cols[i], op, values[i]);
      }
    },
  ];
}

module.exports = {
  WhereCompositeOperation,
};
