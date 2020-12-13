'use strict';

const { UnrelateOperation } = require('../../queryBuilder/operations/UnrelateOperation');

class HasManyUnrelateOperation extends UnrelateOperation {
  queryExecutor(builder) {
    const patch = {};
    const relatedProp = this.relation.relatedProp;
    const ownerValues = this.owner.getProps(this.relation);
    const relatedRefs = relatedProp.refs(builder);

    relatedProp.forEach((i) => {
      relatedProp.patch(patch, i, null);
    });

    return this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, builder.constructor.JoinSelector)
      .copyFrom(builder, builder.constructor.WhereSelector)
      .whereInComposite(relatedRefs, ownerValues)
      .modify(this.relation.modify);
  }
}

module.exports = {
  HasManyUnrelateOperation,
};
