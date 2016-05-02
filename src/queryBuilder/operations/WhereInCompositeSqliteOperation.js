import _ from 'lodash';
import WrappingQueryBuilderOperation from './WrappingQueryBuilderOperation';

export default class WhereInCompositeSqliteOperation extends WrappingQueryBuilderOperation {

  onBuild(knexBuilder) {
    this.whereInComposite(knexBuilder, this.args[0], this.args[1]);
  }

  whereInComposite(knexBuilder, columns, values) {
    let isCompositeKey = _.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      if (!_.isArray(values)) {
        // If the `values` is not an array of values but a function or a subquery
        // we have no way to implement this method.
        throw new Error(`sqlite doesn't support multi-column where in clauses`);
      }

      // Sqlite doesn't support the `where in` syntax for multiple columns but
      // we can emulate it using grouped `or` clauses.
      knexBuilder.where(builder => {
        _.each(values, (val) => {
          builder.orWhere(builder => {
            _.each(columns, (col, idx) => {
              builder.andWhere(col, val[idx]);
            });
          });
        });
      });
    } else {
      let col = _.isString(columns) ? columns : columns[0];

      if (_.isArray(values)) {
        values = _.compact(_.flatten(values));
      }

      // For non-composite keys we can use the normal whereIn.
      knexBuilder.whereIn(col, values);
    }
  }
}

