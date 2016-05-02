import _ from 'lodash';
import WrappingQueryBuilderOperation from './WrappingQueryBuilderOperation';

export default class WhereCompositeOperation extends WrappingQueryBuilderOperation {

  onBuild(knexBuilder) {
    if (this.args.length === 2) {
      this.whereComposite(knexBuilder, this.args[0], '=', this.args[1]);
    } else if (this.args.length === 3) {
      this.whereComposite(knexBuilder, this.args[0], this.args[1], this.args[2]);
    } else {
      throw new Error(`invalid number of arguments ${this.args.length}`);
    }
  }

  whereComposite(knexBuilder, cols, op, values) {
    const colsIsArray = _.isArray(cols);
    const valuesIsArray = _.isArray(values);

    if (!colsIsArray && !valuesIsArray) {
      knexBuilder.where(cols, op, values);
    } else if (colsIsArray && cols.length === 1 && !valuesIsArray) {
      knexBuilder.where(cols[0], op, values);
    } else if (colsIsArray && valuesIsArray && cols.length === values.length) {
      _.each(cols, (col, idx) => knexBuilder.where(col, op, values[idx]));
    } else {
      throw new Error(`both cols and values must have same dimensions`);
    }
  }
}

