'use strict';

const FindOperation = require('./FindOperation');

class InstanceFindOperation extends FindOperation {

  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  onBeforeBuild(builder) {
    builder.whereComposite(builder.modelClass().getFullIdColumn(), this.instance.$id()).first()
  }
}

module.exports = InstanceFindOperation;