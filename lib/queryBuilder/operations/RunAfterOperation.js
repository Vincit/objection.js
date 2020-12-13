'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');

class RunAfterOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.func = null;
  }

  onAdd(_, args) {
    this.func = args[0];
    return true;
  }

  onAfter3(builder, result) {
    return this.func.call(builder, result, builder);
  }

  clone() {
    const clone = super.clone();
    clone.func = this.func;
    return clone;
  }
}

module.exports = {
  RunAfterOperation,
};
