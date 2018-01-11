const ObjectionToKnexConvertingOperation = require('./ObjectionToKnexConvertingOperation');

class WhereCompositeOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder) {
    if (this.args.length === 2) {
      this.build(knexBuilder, this.args[0], '=', this.args[1]);
    } else if (this.args.length === 3) {
      this.build(knexBuilder, this.args[0], this.args[1], this.args[2]);
    } else {
      throw new Error(`invalid number of arguments ${this.args.length}`);
    }
  }

  build(knexBuilder, cols, op, values) {
    const colsIsArray = Array.isArray(cols);
    const valuesIsArray = Array.isArray(values);

    if (!colsIsArray && !valuesIsArray) {
      knexBuilder.where(cols, op, values);
    } else if (colsIsArray && cols.length === 1 && !valuesIsArray) {
      knexBuilder.where(cols[0], op, values);
    } else if (colsIsArray && valuesIsArray && cols.length === values.length) {
      for (let i = 0, l = cols.length; i < l; ++i) {
        knexBuilder.where(cols[i], op, values[i]);
      }
    } else {
      throw new Error(`both cols and values must have same dimensions`);
    }
  }
}

module.exports = WhereCompositeOperation;
