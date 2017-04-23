'use strict';

const InsertOperation = require('./InsertOperation');

class InstanceInsertOperation extends InsertOperation {

  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  call(builder, args) {
    this.isArray = false;
    this.models = [this.instance];
    return true;
  }
}

module.exports = InstanceInsertOperation;