'use strict';

const { InsertOperation } = require('./InsertOperation');

class InstanceInsertOperation extends InsertOperation {
  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  onAdd(builder, args) {
    if (!args || args.length === 0) {
      args = [this.instance];
    } else {
      args[0] = this.instance;
    }

    return super.onAdd(builder, args);
  }
}

module.exports = {
  InstanceInsertOperation,
};
