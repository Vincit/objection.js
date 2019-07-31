'use strict';

const { DeleteOperation } = require('./DeleteOperation');
const { assertHasId } = require('../../utils/assert');

class InstanceDeleteOperation extends DeleteOperation {
  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  async onBefore2(builder, result) {
    await this.instance.$beforeDelete(builder.context());
    await super.onBefore2(builder, result);
    return result;
  }

  onBuild(builder) {
    super.onBuild(builder);

    assertHasId(this.instance);
    builder.findById(this.instance.$id());
  }

  async onAfter2(builder, result) {
    // The result may be an object if `returning` was used.
    if (Array.isArray(result)) {
      result = result[0];
    }

    await this.instance.$afterDelete(builder.context());
    return super.onAfter2(builder, result);
  }
}

module.exports = {
  InstanceDeleteOperation
};
