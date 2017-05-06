'use strict';

const InsertOperation = require('./InsertOperation');

class InstanceInsertOperation extends InsertOperation {

  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  call(builder, args) {
    if (!args || args.length === 0) {
      args = [this.instance];
    } else {
      args[0] = this.instance;
    }

    return super.call(builder, args);
  }
}

module.exports = InstanceInsertOperation;