'use strict';

const { FindOperation } = require('./FindOperation');
const { assertHasId } = require('../../utils/assert');
const { addWhereGroup } = require('../whereGroups');

class InstanceFindOperation extends FindOperation {
  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  onBuild(builder) {
    assertHasId(this.instance);
    addWhereGroup(builder, () => builder.findById(this.instance.$id()));
  }
}

module.exports = {
  InstanceFindOperation,
};
