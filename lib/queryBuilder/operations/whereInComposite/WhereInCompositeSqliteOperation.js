const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');
const { isKnexQueryBuilder } = require('../../../utils/knexUtils');
const { isString } = require('../../../utils/objectUtils');

class WhereInCompositeSqliteOperation extends ObjectionToKnexConvertingOperation {
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
    const whereMethod = this.prefix === 'not' ? 'whereNot' : 'where';

    if (!Array.isArray(values)) {
      // If the `values` is not an array of values but a function or a subquery
      // we have no way to implement this method.
      throw new Error(`sqlite doesn't support multi-column where in clauses`);
    }

    // Sqlite doesn't support the `where in` syntax for multiple columns but
    // we can emulate it using grouped `or` clauses.
    knexBuilder[whereMethod](builder => {
      values.forEach(val => {
        builder.orWhere(builder => {
          columns.forEach((col, idx) => {
            builder.andWhere(col, val[idx]);
          });
        });
      });
    });
  }

  buildNonComposite(knexBuilder, columns, values) {
    const col = isString(columns) ? columns : columns[0];

    if (Array.isArray(values)) {
      values = pickNonNull(values, []);
    } else if (!isKnexQueryBuilder(values)) {
      values = [values];
    }

    // For non-composite keys we can use the normal whereIn.
    if (this.prefix === 'not') {
      knexBuilder.whereNotIn(col, values);
    } else {
      knexBuilder.whereIn(col, values);
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

module.exports = WhereInCompositeSqliteOperation;
