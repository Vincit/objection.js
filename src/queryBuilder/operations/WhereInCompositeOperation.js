import _ from 'lodash';
import WrappingQueryBuilderOperation from './WrappingQueryBuilderOperation';

export default class WhereInCompositeOperation extends WrappingQueryBuilderOperation {

  onBuild(knexBuilder) {
    this.whereInComposite(knexBuilder, this.args[0], this.args[1]);
  }

  whereInComposite(knexBuilder, columns, values) {
    let isCompositeKey = _.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      if (_.isArray(values)) {
        return knexBuilder.whereIn(columns, values);
      } else {
        // Because of a bug in knex, we need to build the where-in query from pieces
        // if the value is a subquery.
        let sql = '(' + _.map(columns, col => this.formatter().wrap(col)).join() + ')';
        knexBuilder.whereIn(this.raw(sql), values);
      }
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

