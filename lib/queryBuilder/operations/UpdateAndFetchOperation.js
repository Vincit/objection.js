'use strict';

const { DelegateOperation } = require('./DelegateOperation');
const { FindByIdOperation } = require('./FindByIdOperation');
const { UpdateOperation } = require('./UpdateOperation');
const { addWhereGroup, assignWhereGroup } = require('../whereGroups');

class UpdateAndFetchOperation extends DelegateOperation {
  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(UpdateOperation)) {
      throw new Error('Invalid delegate');
    }

    this.id = null;
    this.skipIdWhere = false;
    this.selectOperations = null;
  }

  get model() {
    return this.delegate.model;
  }

  onAdd(builder, args) {
    this.id = args[0];
    return this.delegate.onAdd(builder, args.slice(1));
  }

  onBefore3(builder, result) {
    // Selects have no effect on the update query, so remember them here to
    // apply them to the fetch query. Collect them before the query is built,
    // so that selects added by `onBuild` hooks in the shared context aren't
    // copied, as those hooks run again for the fetch query.
    this.selectOperations = new Set();
    builder.forEachOperation(builder.constructor.SelectSelector, (op) => {
      this.selectOperations.add(op);
    });

    return super.onBefore3(builder, result);
  }

  onBuild(builder) {
    if (!this.skipIdWhere) {
      addWhereGroup(builder, () => builder.findById(this.id));
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
      .copyFrom(builder, (op) => !!this.selectOperations?.has(op))
      .modify((builder) => {
        if (!this.skipIdWhere) {
          builder.findById(this.id);
        }
      })
      .castTo(builder.resultModelClass());

    if (fetched) {
      this.model.$set(fetched);
      // A custom `select` may not include the id. The row was fetched by
      // id, so make sure the result still has it.
      if (!this.model.$hasId()) {
        this.model.$id(this.id);
      }
    }

    await super.onAfter2(builder, numUpdated);
    return fetched ? this.model : undefined;
  }

  toFindOperation(builder) {
    // The find operation of the delegate keeps its filters, e.g. the ones that
    // many-to-many updates move to a subquery when the query is built.
    const delegate = this.delegate.toFindOperation(builder);

    // Keep the id condition in its own where group, like `onBuild()` does. The
    // delegate isn't named `findById`, as that would put all the wheres that it
    // adds in the user's group.
    return delegate
      ? new FindByIdDelegateOperation('find', { delegate, id: this.id })
      : assignWhereGroup(new FindByIdOperation('findById', { id: this.id }));
  }

  clone() {
    const clone = super.clone();

    clone.id = this.id;
    clone.skipIdWhere = this.skipIdWhere;

    return clone;
  }
}

// Finds the rows of a delegate find operation by id, like `UpdateAndFetchOperation`
// updates them.
class FindByIdDelegateOperation extends DelegateOperation {
  onBuild(builder) {
    super.onBuild(builder);
    addWhereGroup(builder, () => builder.findById(this.opt.id));
  }
}

module.exports = {
  UpdateAndFetchOperation,
};
