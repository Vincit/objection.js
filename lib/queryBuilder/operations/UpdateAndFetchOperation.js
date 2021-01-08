'use strict';

const { DelegateOperation } = require('./DelegateOperation');
const { FindByIdOperation } = require('./FindByIdOperation');
const { UpdateOperation } = require('./UpdateOperation');

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
    if (!this.skipIdWhere) {
      builder.findById(this.id);
    }

    super.onBuild(builder);
  }

  async onAfter2(builder, numUpdated) {
    if (numUpdated == 0) {
      // If nothing was updated, we should fetch nothing.
      await super.onAfter2(builder, numUpdated);
      return undefined;
    }

    const fetched = await builder
      .emptyInstance()
      .childQueryOf(builder)
      .modify((builder) => {
        if (!this.skipIdWhere) {
          builder.findById(this.id);
        }
      })
      .castTo(builder.resultModelClass());

    if (fetched) {
      this.model.$set(fetched);
    }

    await super.onAfter2(builder, numUpdated);
    return fetched ? this.model : undefined;
  }

  toFindOperation() {
    return new FindByIdOperation('findById', {
      id: this.id,
    });
  }

  clone() {
    const clone = super.clone();

    clone.id = this.id;
    clone.skipIdWhere = this.skipIdWhere;

    return clone;
  }
}

module.exports = {
  UpdateAndFetchOperation,
};
