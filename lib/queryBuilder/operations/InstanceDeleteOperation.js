'use strict';

const { DeleteOperation } = require('./DeleteOperation');
const { assertHasId } = require('../../utils/assert');
const { afterReturn, after } = require('../../utils/promiseUtils');

class InstanceDeleteOperation extends DeleteOperation {
  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  onBefore2(builder, result) {
    let maybePromise = this.instance.$beforeDelete(builder.context());
    maybePromise = after(maybePromise, () => super.onBefore2(builder, result));
    return afterReturn(maybePromise, result);
  }

  onBuild(builder) {
    super.onBuild(builder);

    assertHasId(this.instance);
    builder.findById(this.instance.$id());
  }

  onAfter2(builder, result) {
    // The result may be an object if `returning` was used.
    if (Array.isArray(result)) {
      result = result[0];
    }

    const maybePromise = this.instance.$afterDelete(builder.context());
    return after(maybePromise, () => super.onAfter2(builder, result));
  }
}

module.exports = {
  InstanceDeleteOperation
};
