'use strict';

const DeleteOperation = require('./DeleteOperation');
const afterReturn = require('../../utils/promiseUtils').afterReturn;

class InstanceDeleteOperation extends DeleteOperation {
  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  onBefore2(builder, result) {
    const maybePromise = this.instance.$beforeDelete(builder.context());
    return afterReturn(maybePromise, result);
  }

  onBuild(builder) {
    super.onBuild(builder);
    builder.whereComposite(builder.fullIdColumnFor(builder.modelClass()), this.instance.$id());
  }

  onAfter2(builder, result) {
    const maybePromise = this.instance.$afterDelete(builder.context());
    return afterReturn(maybePromise, result);
  }
}

module.exports = InstanceDeleteOperation;
