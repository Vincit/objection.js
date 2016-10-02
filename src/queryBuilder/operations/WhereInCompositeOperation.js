import _ from 'lodash';
import WrappingQueryBuilderOperation from './WrappingQueryBuilderOperation';

export default class WhereInCompositeOperation extends WrappingQueryBuilderOperation {

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
    if (Array.isArray(values)) {
      this.buildCompositeValue(knexBuilder, columns, values);
    } else {
      this.buildCompositeSubquery(knexBuilder, columns, values);
    }
  }

  buildCompositeValue(knexBuilder, columns, values) {
    knexBuilder.whereIn(columns, values);
  }

  buildCompositeSubquery(knexBuilder, columns, subquery) {
    const formatter = knexBuilder.client.formatter();

    let sql = '(';
    for (let i = 0, l = columns.length; i < l; ++i) {
      sql += formatter.wrap(columns[i]);

      if (i !== columns.length - 1) {
        sql += ',';
      }
    }
    sql += ')';

    knexBuilder.whereIn(knexBuilder.client.raw(sql), subquery);
  }

  buildNonComposite(knexBuilder, columns, values) {
    let col = (typeof columns === 'string') ? columns : columns[0];

    if (Array.isArray(values)) {
      values = _.compact(_.flatten(values));
    } else {
      values = [values];
    }

    knexBuilder.whereIn(col, values);
  }
}

