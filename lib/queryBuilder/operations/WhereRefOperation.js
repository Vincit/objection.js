'use strict';

const ObjectionToKnexConvertingOperation = require('./ObjectionToKnexConvertingOperation');

class WhereRefOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder) {
    if (this.args.length === 2) {
      this.whereRef(knexBuilder, this.args[0], '=', this.args[1]);
    } else if (this.args.length === 3) {
      this.whereRef(knexBuilder, this.args[0], this.args[1], this.args[2]);
    } else {
      throw new Error('expected 2 or 3 arguments');
    }
  }

  whereRef(knexBuilder, lhs, op, rhs) {
    op = knexBuilder.client.formatter().operator(op);

    if (typeof lhs !== 'string' || typeof rhs !== 'string' || typeof op !== 'string') {
      throw new Error('whereRef: invalid operands or operator');
    }

    let sql = `?? ${op} ??`;

    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw(sql, [lhs, rhs]);
    } else {
      knexBuilder.whereRaw(sql, [lhs, rhs]);
    }
  }
}

module.exports = WhereRefOperation;
