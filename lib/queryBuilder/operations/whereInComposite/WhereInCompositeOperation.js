'use strict';

const { ObjectionToKnexConvertingOperation } = require('../ObjectionToKnexConvertingOperation');
const { isObject, asSingle } = require('../../../utils/objectUtils');
const { isKnexQueryBuilder } = require('../../../utils/knexUtils');

class WhereInCompositeOperation extends ObjectionToKnexConvertingOperation {
  constructor(name, opt) {
    super(name, opt);
    this.prefix = this.opt.prefix || null;
  }

  onBuildKnex(knexBuilder, builder) {
    const whereInArgs = buildWhereInArgs(builder.knex(), ...this.getKnexArgs(builder));

    if (this.prefix === 'not') {
      return knexBuilder.whereNotIn(...whereInArgs);
    } else {
      return knexBuilder.whereIn(...whereInArgs);
    }
  }

  clone() {
    const clone = super.clone();
    clone.prefix = this.prefix;
    return clone;
  }
}

function buildWhereInArgs(knex, columns, values) {
  if (isCompositeKey(columns)) {
    return buildCompositeArgs(knex, columns, values);
  } else {
    return buildNonCompositeArgs(columns, values);
  }
}

function isCompositeKey(columns) {
  return Array.isArray(columns) && columns.length > 1;
}

function buildCompositeArgs(knex, columns, values) {
  if (Array.isArray(values)) {
    return buildCompositeValueArgs(columns, values);
  } else {
    return buildCompositeSubqueryArgs(knex, columns, values);
  }
}

function buildCompositeValueArgs(columns, values) {
  return [columns, values];
}

function buildCompositeSubqueryArgs(knex, columns, subquery) {
  const sql = `(${columns
    .map(col => {
      // On older versions of knex, raw doesn't work
      // with `??`. We use `?` for those.
      if (isObject(col)) {
        return '?';
      } else {
        return '??';
      }
    })
    .join(',')})`;

  return [knex.raw(sql, columns), subquery];
}

function buildNonCompositeArgs(columns, values) {
  if (Array.isArray(values)) {
    values = pickNonNull(values, []);
  } else if (!isKnexQueryBuilder(values)) {
    values = [values];
  }

  return [asSingle(columns), values];
}

function pickNonNull(values, output) {
  for (let i = 0, l = values.length; i < l; ++i) {
    const val = values[i];

    if (Array.isArray(val)) {
      pickNonNull(val, output);
    } else if (val !== null && val !== undefined) {
      output.push(val);
    }
  }

  return output;
}

module.exports = {
  WhereInCompositeOperation
};
