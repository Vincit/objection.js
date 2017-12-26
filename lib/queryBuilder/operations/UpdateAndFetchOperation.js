const DelegateOperation = require('./DelegateOperation');
const UpdateOperation = require('./UpdateOperation');
const { afterReturn } = require('../../utils/promiseUtils');

class UpdateAndFetchOperation extends DelegateOperation {
  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(UpdateOperation)) {
      throw new Error('Invalid delegate');
    }

    this.id = null;
    this.skipIdWhere = false;
  }

  get model() {
    return this.delegate.model;
  }

  onAdd(builder, args) {
    this.id = args[0];
    return this.delegate.onAdd(builder, args.slice(1));
  }

  onBuild(builder) {
    super.onBuild(builder);

    if (!this.skipIdWhere) {
      const idColumn = builder.fullIdColumnFor(builder.modelClass());
      const id = this.id;

      builder.whereComposite(idColumn, id);
    }
  }

  onAfter2(builder, numUpdated) {
    if (numUpdated == 0) {
      // If nothing was updated, we should fetch nothing.
      return afterReturn(super.onAfter2(builder, numUpdated), undefined);
    }

    return builder
      .modelClass()
      .query()
      .childQueryOf(builder)
      .whereComposite(builder.fullIdColumnFor(builder.modelClass()), this.id)
      .castTo(builder.resultModelClass())
      .first()
      .then(fetched => {
        let retVal = undefined;

        if (fetched) {
          this.model.$set(fetched);
          retVal = this.model;
        }

        return afterReturn(super.onAfter2(builder, numUpdated), retVal);
      });
  }
}

module.exports = UpdateAndFetchOperation;
