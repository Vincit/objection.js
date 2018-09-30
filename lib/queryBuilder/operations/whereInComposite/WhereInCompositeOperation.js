const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');
const { isObject, isString } = require('../../../utils/objectUtils');
const { isKnexQueryBuilder } = require('../../../utils/knexUtils');

class WhereInCompositeOperation extends ObjectionToKnexConvertingOperation {
  constructor(name, opt) {
    super(name, opt);

    this.prefix = this.opt.prefix || null;
  }

  onBuildKnex(knexBuilder, builder) {
    this.build(builder.knex(), knexBuilder, this.args[0], this.args[1]);
  }

  build(knex, knexBuilder, columns, values) {
    let isCompositeKey = Array.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      this.buildComposite(knex, knexBuilder, columns, values);
    } else {
      this.buildNonComposite(knexBuilder, columns, values);
    }
  }

  buildComposite(knex, knexBuilder, columns, values) {
    if (Array.isArray(values)) {
      this.buildCompositeValue(knexBuilder, columns, values);
    } else {
      this.buildCompositeSubquery(knex, knexBuilder, columns, values);
    }
  }

  buildCompositeValue(knexBuilder, columns, values) {
    this.whereIn(knexBuilder, columns, values);
  }

  buildCompositeSubquery(knex, knexBuilder, columns, subquery) {
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

    this.whereIn(knexBuilder, knex.raw(sql, columns), subquery);
  }

  buildNonComposite(knexBuilder, columns, values) {
    const col = isString(columns) ? columns : columns[0];

    if (Array.isArray(values)) {
      values = pickNonNull(values, []);
    } else if (!isKnexQueryBuilder(values)) {
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
