'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');

class FindByIdsOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.ids = null;
  }

  onAdd(builder, args) {
    this.ids = args[0];
    return super.onAdd(builder, args);
  }

  onBuild(builder) {
    builder.whereInComposite(builder.fullIdColumn(), this.ids);
  }

  clone() {
    const clone = super.clone();
    clone.ids = this.ids;
    return clone;
  }
}

module.exports = {
  FindByIdsOperation,
};
