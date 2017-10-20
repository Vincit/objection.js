'use strict';

const QueryBuilderOperation = require('../../queryBuilder/operations/QueryBuilderOperation');

class HasManyUnrelateOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.isWriteOperation = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
    this.ids = null;
  }

  queryExecutor(builder) {
    const patch = {};
    const ownerProp = this.relation.ownerProp;
    const relatedProp = this.relation.relatedProp;
    const relatedRefs = relatedProp.refs(builder);
    const ownerValues = ownerProp.getProps(this.owner);

    for (let i = 0, l = relatedProp.size; i < l; ++i) {
      relatedProp.patch(patch, i, null);
    }

    return this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, builder.constructor.WhereSelector)
      .whereComposite(relatedRefs, ownerValues)
      .modify(this.relation.modify);
  }
}

module.exports = HasManyUnrelateOperation;
