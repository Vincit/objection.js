'use strict';

const UpdateOperation = require('./UpdateOperation');
const after = require('../../utils/promiseUtils').after;

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

    const idColumn = builder.fullIdColumnFor(builder.modelClass());
    const id = this.instance.$id();

    builder.whereComposite(idColumn, id);
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