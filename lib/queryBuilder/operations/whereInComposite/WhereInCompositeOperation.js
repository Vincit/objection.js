'use strict';

const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');

class WhereInCompositeOperation extends ObjectionToKnexConvertingOperation {

  constructor(name, opt) {
    super(name, opt);

    this.prefix = this.opt.prefix || null;
  }

  onBuildKnex(knexBuilder) {
    this.build(knexBuilder, this.args[0], this.args[1]);
  }

  build(knexBuilder, columns, values) {
    let isCompositeKey = Array.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      this.buildComposite(knexBuilder, columns, values);
    } else {
      this.buildNonComposite(knexBuilder, columns, values);
    }
  }

  buildComposite(knexBuilder, columns, values) {
    if (Array.isArray(values)) {
      this.buildCompositeValue(knexBuilder, columns, values);
    } else {
      this.buildCompositeSubquery(knexBuilder, columns, values);
    }
  }

  buildCompositeValue(knexBuilder, columns, values) {
    this.whereIn(knexBuilder, columns, values);
  }

  buildCompositeSubquery(knexBuilder, columns, subquery) {
    const formatter = knexBuilder.client.formatter();

    // Needs to be var instead of let to prevent a weird
    // optimization bailout.
    var sql = '(';

    for (let i = 0, l = columns.length; i < l; ++i) {
      sql += formatter.wrap(columns[i]);

      if (i !== columns.length - 1) {
        sql += ',';
      }
    }

    sql += ')';

    this.whereIn(knexBuilder, knexBuilder.client.raw(sql), subquery);
  }

  buildNonComposite(knexBuilder, columns, values) {
    const col = (typeof columns === 'string') ? columns : columns[0];

    if (Array.isArray(values)) {
      values = pickNonNull(values, []);
    } else {
      values = [values];
    }

    this.whereIn(knexBuilder, col, values);
  }

  whereIn(knexBuilder, col, val) {
    if (this.prefix === 'not') {
      knexBuilder.whereNotIn(col, val);
    } else {
      knexBuilder.whereIn(col, val);
    }
  }
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

module.exports = WhereInCompositeOperation;

