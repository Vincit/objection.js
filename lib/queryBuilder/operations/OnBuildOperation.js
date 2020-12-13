'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');

class OnBuildOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.func = null;
  }

  onAdd(_, args) {
    this.func = args[0];
    return true;
  }

  onBuild(builder) {
    return this.func.call(builder, builder);
  }

  clone() {
    const clone = super.clone();
    clone.func = this.func;
    return clone;
  }
}

module.exports = {
  OnBuildOperation,
};
