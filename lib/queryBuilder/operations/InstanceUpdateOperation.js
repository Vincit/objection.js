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

    const modelClass = builder.modelClass();
    const idColumn = builder.fullIdColumnFor(modelClass);

    builder.whereComposite(idColumn, this.instance.$id());
  }

  onAfter2(builder, result) {
    // The result may be an object if `returning` was used.
    if (Array.isArray(result)) {
      result = result[0];
    }

    const maybePromise = super.onAfter2(builder, result);

    return after(maybePromise, result => {
      this.instance.$set(this.model);

      if (result && typeof result === 'object') {
        this.instance.$set(result);
      }

      return result;
    });
  }
}

module.exports = InstanceUpdateOperation;
