import _ from 'lodash';
import WrappingQueryBuilderOperation from './WrappingQueryBuilderOperation';

export default class WhereRefOperation extends WrappingQueryBuilderOperation {

  onBuild(knexBuilder) {
    if (this.args.length === 2) {
      this.whereRef(knexBuilder, this.args[0], '=', this.args[1]);
    } else if (this.args.length === 3) {
      this.whereRef(knexBuilder, this.args[0], this.args[1], this.args[2]);
    } else {
      throw new Error('expected 2 or 3 arguments');
    }
  }

  whereRef(knexBuilder, lhs, op, rhs) {
    const formatter = this.formatter();
    op = formatter.operator(op);

    if (!_.isString(lhs) || !_.isString(rhs) || !_.isString(op)) {
      throw new Error('whereRef: invalid operands or operator');
    }

    let sql = formatter.wrap(lhs) + ' ' + op + ' ' + formatter.wrap(rhs);

    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw(sql);
    } else {
      knexBuilder.whereRaw(sql);
    }
  }
}

