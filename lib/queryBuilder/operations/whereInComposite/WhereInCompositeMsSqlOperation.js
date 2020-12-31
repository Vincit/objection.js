'use strict';

const { ObjectionToKnexConvertingOperation } = require('../ObjectionToKnexConvertingOperation');
const { flatten, zipObject, isString } = require('../../../utils/objectUtils');
const { getTempColumn } = require('../../../utils/tmpColumnUtils');

class WhereInCompositeMsSqlOperation extends ObjectionToKnexConvertingOperation {
  constructor(name, opt) {
    super(name, opt);
    this.prefix = this.opt.prefix || null;
  }

  onBuildKnex(knexBuilder, builder) {
    const args = this.getKnexArgs(builder);
    return this.build(builder.knex(), knexBuilder, args[0], args[1]);
  }

  build(knex, knexBuilder, columns, values) {
    let isCompositeKey = Array.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      return this.buildComposite(knex, knexBuilder, columns, values);
    } else {
      return this.buildNonComposite(knexBuilder, columns, values);
    }
  }

  buildComposite(knex, knexBuilder, columns, values) {
    const helperColumns = columns.map((_, index) => getTempColumn(index));

    if (Array.isArray(values)) {
      return this.buildCompositeValue(knex, knexBuilder, columns, helperColumns, values);
    } else {
      return this.buildCompositeSubquery(
        knex,
        knexBuilder,
        columns,
        helperColumns,
        values.as(knex.raw(`V(${helperColumns.map((_) => '??')})`, helperColumns))
      );
    }
  }

  buildCompositeValue(knex, knexBuilder, columns, helperColumns, values) {
    return this.buildCompositeSubquery(
      knex,
      knexBuilder,
      columns,
      helperColumns,
      knex.raw(
        `(VALUES ${values
          .map((value) => `(${value.map((_) => '?').join(',')})`)
          .join(',')}) AS V(${helperColumns.map((_) => '??').join(',')})`,
        flatten(values).concat(helperColumns)
      )
    );
  }

  buildCompositeSubquery(knex, knexBuilder, columns, helperColumns, subQuery) {
    const wrapperQuery = knex.from(subQuery).where(
      zipObject(
        helperColumns,
        columns.map((column) => knex.raw('??', column))
      )
    );

    if (this.prefix === 'not') {
      return knexBuilder.whereNotExists(wrapperQuery);
    } else {
      return knexBuilder.whereExists(wrapperQuery);
    }
  }

  buildNonComposite(knexBuilder, columns, values) {
    const col = isString(columns) ? columns : columns[0];

    if (Array.isArray(values)) {
      values = pickNonNull(values, []);
    } else {
      values = [values];
    }

    return this.whereIn(knexBuilder, col, values);
  }

  whereIn(knexBuilder, col, val) {
    if (this.prefix === 'not') {
      return knexBuilder.whereNotIn(col, val);
    } else {
      return knexBuilder.whereIn(col, val);
    }
  }

  clone() {
    const clone = super.clone();
    clone.prefix = this.prefix;
    return clone;
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

module.exports = {
  WhereInCompositeMsSqlOperation,
};
