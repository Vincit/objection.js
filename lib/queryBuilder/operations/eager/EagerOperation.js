'use strict';

const { QueryBuilderOperation } = require('../QueryBuilderOperation');

class EagerOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.expression = null;
    this.modifiers = null;
  }

  onAdd(_, args) {
    this.expression = args[0];
    this.modifiers = args[1];

    return true;
  }

  clone() {
    const clone = super.clone();

    clone.expression = this.expression && this.expression.clone();
    clone.modifiers = Object.assign({}, this.modifiers);

    return clone;
  }
}

module.exports = {
  EagerOperation
};
