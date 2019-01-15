'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { GraphUpsert } = require('../graph/GraphUpsert');

class UpsertGraphOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(
      name,
      Object.assign({}, opt, {
        upsertOptions: {}
      })
    );

    this.upsertOptions = opt.upsertOptions || {};
    this.upsert = null;
  }

  get models() {
    return this.upsert.objects;
  }

  get isArray() {
    return this.upsert.isArray;
  }

  onAdd(builder, args) {
    const [objects] = args;

    this.upsert = new GraphUpsert({
      objects,
      rootModelClass: builder.modelClass(),
      upsertOptions: this.upsertOptions
    });

    // Never execute this builder.
    builder.resolve([]);

    return true;
  }

  onAfter1(builder) {
    return this.upsert.run(builder);
  }

  clone() {
    const clone = super.clone();
    clone.upsert = this.upsert;
    return clone;
  }
}

module.exports = {
  UpsertGraphOperation
};
