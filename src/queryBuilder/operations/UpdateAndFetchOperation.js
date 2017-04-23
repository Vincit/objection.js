'use strict';

const DelegateOperation = require('./DelegateOperation');
const UpdateOperation = require('./UpdateOperation');
const afterReturn = require('../../utils/promiseUtils').afterReturn;

class UpdateAndFetchOperation extends DelegateOperation {

  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(UpdateOperation)) {
      throw new Error('Invalid delegate');
    }

    this.id = null;
  }

  get model() {
    return this.delegate.model;
  }

  call(builder, args) {
    this.id = args[0];
    return this.delegate.call(builder, args.slice(1));
  }

  onBeforeBuild(builder) {
    super.onBeforeBuild(builder);
    builder.whereComposite(builder.modelClass().getFullIdColumn(), this.id);
  }

  onAfterInternal(builder, numUpdated) {
    if (numUpdated == 0) {
      // If nothing was updated, we should fetch nothing.
      return afterReturn(super.onAfterInternal(builder, numUpdated), undefined);
    }

    return builder.modelClass()
      .query()
      .childQueryOf(builder)
      .whereComposite(builder.modelClass().getFullIdColumn(), this.id)
      .first()
      .then(fetched => {
        let retVal = null;

        if (fetched) {
          this.model.$set(fetched);
          retVal = this.model;
        }

        return afterReturn(super.onAfterInternal(builder, numUpdated), retVal);
      });
  }
}

module.exports = UpdateAndFetchOperation;