'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');

class RelateOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
    this.input = null;
    this.ids = null;
  }

  clone() {
    const clone = super.clone();

    clone.input = this.input;
    clone.ids = this.ids;

    return clone;
  }
}

module.exports = {
  RelateOperation,
};
