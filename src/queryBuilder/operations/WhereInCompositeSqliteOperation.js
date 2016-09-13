import _ from 'lodash';
import WrappingQueryBuilderOperation from './WrappingQueryBuilderOperation';

export default class WhereInCompositeSqliteOperation extends WrappingQueryBuilderOperation {

  onBuild(knexBuilder) {
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
    if (!Array.isArray(values)) {
      // If the `values` is not an array of values but a function or a subquery
      // we have no way to implement this method.
      throw new Error(`sqlite doesn't support multi-column where in clauses`);
    }

    // Sqlite doesn't support the `where in` syntax for multiple columns but
    // we can emulate it using grouped `or` clauses.
    knexBuilder.where(builder => {
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
    let col = (typeof columns === 'string') ? columns : columns[0];

    if (Array.isArray(values)) {
      values = _.compact(_.flatten(values));
    }

    // For non-composite keys we can use the normal whereIn.
    knexBuilder.whereIn(col, values);
  }
}

