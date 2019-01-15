'use strict';

const { DelegateOperation } = require('./DelegateOperation');
const { InsertOperation } = require('./InsertOperation');
const { GraphUpsert } = require('../graph/GraphUpsert');

class InsertGraphOperation extends DelegateOperation {
  constructor(name, opt = null) {
    super(name, opt);

    if (!this.delegate.is(InsertOperation)) {
      throw new Error('Invalid delegate');
    }

    Object.assign(this.delegate.modelOptions, GraphUpsert.modelOptions);
    this.upsertOptions = opt.opt || {};
    this.upsert = null;
  }

  get models() {
    return this.delegate.models;
  }

  get isArray() {
    return this.delegate.isArray;
  }

  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);

    this.upsert = new GraphUpsert({
      objects: this.models,
      rootModelClass: builder.modelClass(),

      upsertOptions: Object.assign({}, this.upsertOptions, {
        noUpdate: true,
        noDelete: true,
        noUnrelate: true,
        insertMissing: true
      })
    });

    // We resolve this query here and will not execute it. This is because the root
    // value may depend on other models in the graph and cannot be inserted first.
    builder.resolve([]);

    return retVal;
  }

  onBefore1() {
    // Do nothing.
  }

  onBefore2() {
    // Do nothing. We override this with empty implementation so that
    // the $beforeInsert() hooks are not called twice for the root models.
  }

  onBefore3() {
    // Do nothing.
  }

  onBuild() {
    // Do nothing.
  }

  onBuildKnex() {
    // Do nothing.
  }

  // We overrode all other hooks but this one and do all the work in here.
  // This is a bit hacky.
  onAfter1(builder, ...restArgs) {
    return this.upsert.run(builder).then(() => super.onAfter1(builder, ...restArgs));
  }

  onAfter2() {
    // We override this with empty implementation so that the $afterInsert() hooks
    // are not called twice for the root models.
    return this.isArray ? this.models : this.models[0] || null;
  }

  clone() {
    const clone = super.clone();
    clone.upsert = this.upsert;
    return clone;
  }
}

module.exports = {
  InsertGraphOperation
};
