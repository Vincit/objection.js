'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');

class FindByIdOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.id = null;
  }

  onAdd(builder, args) {
    this.id = args[0];
    return super.onAdd(builder, args);
  }

  onBuild(builder) {
    builder.whereComposite(builder.fullIdColumn(), this.id);
  }

  clone() {
    const clone = super.clone();
    clone.id = this.id;
    return clone;
  }
}

module.exports = {
  FindByIdOperation
};
