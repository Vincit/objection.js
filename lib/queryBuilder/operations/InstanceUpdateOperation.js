'use strict';

const { UpdateOperation } = require('./UpdateOperation');
const { assertHasId } = require('../../utils/assert');
const { isObject } = require('../../utils/objectUtils');

class InstanceUpdateOperation extends UpdateOperation {
  constructor(name, opt) {
    super(name, opt);

    this.instance = opt.instance;
    this.modelOptions.old = opt.instance;
  }

  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);

    if (!this.model) {
      this.model = this.instance;
    }

    return retVal;
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

    result = await super.onAfter2(builder, result);
    this.instance.$set(this.model);

    if (isObject(result)) {
      this.instance.$set(result);
    }

    return result;
  }
}

module.exports = {
  InstanceUpdateOperation
};
