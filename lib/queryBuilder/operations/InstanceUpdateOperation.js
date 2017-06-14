'use strict';

const UpdateOperation = require('./UpdateOperation');
const after = require('../../utils/promiseUtils').after;

class InstanceUpdateOperation extends UpdateOperation {

  constructor(name, opt) {
    super(name, opt);

    this.instance = opt.instance;
    this.modelOptions.old = opt.instance;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    if (!this.model) {
      this.model = this.instance;
    }

    return retVal;
  }

  onBuild(builder) {
    super.onBuild(builder);
    builder.whereComposite(builder.fullIdColumnFor(builder.modelClass()), this.instance.$id());
  }

  onAfter2(builder, numUpdated) {
    const maybePromise = super.onAfter2(builder, numUpdated);
    
    return after(maybePromise, result => {
      this.instance.$set(this.model);
      return result;
    });
  }
}

module.exports = InstanceUpdateOperation;