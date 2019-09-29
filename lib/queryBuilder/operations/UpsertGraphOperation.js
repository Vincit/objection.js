'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');
const { GraphUpsert } = require('../graph/GraphUpsert');
const { RelationFindOperation } = require('../../relations/RelationFindOperation');

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
    if (hasOtherSqlModifyingQueryBuilderCalls(builder)) {
      throw new Error(
        'upsertGraph query should contain no other query builder calls like `findById`, `where` or `$relatedQuery` that would affect the SQL. They have no effect.'
      );
    }

    return this.upsert.run(builder);
  }

  clone() {
    const clone = super.clone();
    clone.upsert = this.upsert;
    return clone;
  }
}

function hasOtherSqlModifyingQueryBuilderCalls(builder) {
  return builder.has(/where/) || builder.has(RelationFindOperation);
}

module.exports = {
  UpsertGraphOperation
};
