'use strict';

const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');
const { getTempColumn } = require('../../../utils/tmpColumnUtils');
const zipObject = require('lodash/zipObject');
const flatten = require('lodash/flatten');

class WhereInCompositeMsSqlOperation extends ObjectionToKnexConvertingOperation {
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
    const helperColumns = columns.map((_, index) => getTempColumn(index));

    if (Array.isArray(values)) {
      this.buildCompositeValue(knex, knexBuilder, columns, helperColumns, values);
    } else {
      this.buildCompositeSubquery(
        knex,
        knexBuilder,
        columns,
        helperColumns,
        values.as(knex.raw(`V(${helperColumns.map(_ => '??')})`, helperColumns))
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
          .map(value => `(${value.map(_ => '?').join(',')})`)
          .join(',')}) AS V(${helperColumns.map(_ => '??').join(',')})`,
        flatten(values).concat(helperColumns)
      )
    );
  }

  buildCompositeSubquery(knex, knexBuilder, columns, helperColumns, subQuery) {
    const wrapperQuery = knex
      .from(subQuery)
      .where(zipObject(helperColumns, columns.map(column => knex.raw('??', column))));

    if (this.prefix === 'not') {
      return knexBuilder.whereNotExists(wrapperQuery);
    } else {
      return knexBuilder.whereExists(wrapperQuery);
    }
  }

  buildNonComposite(knexBuilder, columns, values) {
    const col = typeof columns === 'string' ? columns : columns[0];

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

module.exports = WhereInCompositeMsSqlOperation;
