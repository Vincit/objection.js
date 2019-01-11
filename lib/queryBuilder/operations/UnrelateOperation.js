'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');

class UnrelateOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
    this.ids = null;
  }

  clone() {
    const clone = super.clone();
    clone.ids = this.ids;
    return clone;
  }
}

module.exports = {
  UnrelateOperation
};
