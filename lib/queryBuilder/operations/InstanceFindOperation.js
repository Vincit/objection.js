'use strict';

const { FindOperation } = require('./FindOperation');
const { assertHasId } = require('../../utils/assert');

class InstanceFindOperation extends FindOperation {
  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  onBuild(builder) {
    assertHasId(this.instance);
    builder.findById(this.instance.$id());
  }
}

module.exports = {
  InstanceFindOperation
};
