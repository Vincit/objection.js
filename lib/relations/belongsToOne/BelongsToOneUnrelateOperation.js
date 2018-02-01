const UnrelateOperation = require('../../queryBuilder/operations/UnrelateOperation');

class BelongsToOneUnrelateOperation extends UnrelateOperation {
  onAdd(builder, args) {
    const ids = new Array(this.relation.ownerProp.size);

    for (let i = 0, l = this.relation.ownerProp.size; i < l; ++i) {
      ids[i] = null;
    }

    this.ids = [ids];
    return true;
  }

  queryExecutor(builder) {
    const patch = {};
    const ownerProp = this.relation.ownerProp;
    const idColumn = builder.fullIdColumnFor(this.relation.ownerModelClass);

    for (let i = 0, l = ownerProp.size; i < l; ++i) {
      const relatedValue = this.ids[0][i];

      ownerProp.setProp(this.owner, i, relatedValue);
      ownerProp.patch(patch, i, relatedValue);
    }

    return this.relation.ownerModelClass
      .query()
      .childQueryOf(builder)
      .copyFrom(builder, builder.constructor.WhereSelector)
      .patch(patch)
      .whereComposite(idColumn, this.owner.$id());
  }
}

module.exports = BelongsToOneUnrelateOperation;
