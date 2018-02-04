const UnrelateOperation = require('../../queryBuilder/operations/UnrelateOperation');

class HasManyUnrelateOperation extends UnrelateOperation {
  queryExecutor(builder) {
    const patch = {};
    const ownerProp = this.relation.ownerProp;
    const relatedProp = this.relation.relatedProp;
    const ownerValues = ownerProp.getProps(this.owner);
    const relatedRefs = relatedProp.refs(builder);

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
