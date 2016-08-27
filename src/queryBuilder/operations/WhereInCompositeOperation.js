import _ from 'lodash';
import WrappingQueryBuilderOperation from './WrappingQueryBuilderOperation';

export default class WhereInCompositeOperation extends WrappingQueryBuilderOperation {

  onBuild(knexBuilder) {
    this.build(knexBuilder, this.args[0], this.args[1]);
  }

  build(knexBuilder, columns, values) {
    let isCompositeKey = _.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      this.buildComposite(knexBuilder, columns, values);
    } else {
      this.buildNonComposite(knexBuilder, columns, values);
    }
  }

  buildComposite(knexBuilder, columns, values) {
    if (_.isArray(values)) {
      this.buildCompositeValue(knexBuilder, columns, values);
    } else {
      this.buildCompositeSubquery(knexBuilder, columns, values);
    }
  }

  buildCompositeValue(knexBuilder, columns, values) {
    knexBuilder.whereIn(columns, values);
  }

  buildCompositeSubquery(knexBuilder, columns, subquery) {
    let formatter = this.formatter();
    let sql = '(' + _.map(columns, col => formatter.wrap(col)).join(',') + ')';

    knexBuilder.whereIn(this.raw(sql), subquery);
  }

  buildNonComposite(knexBuilder, columns, values) {
    let col = _.isString(columns) ? columns : columns[0];

    if (_.isArray(values)) {
      values = _.compact(_.flatten(values));
    } else {
      values = [values];
    }

    knexBuilder.whereIn(col, values);
  }
}

