'use strict';

const { UnrelateOperation } = require('../../queryBuilder/operations/UnrelateOperation');

class BelongsToOneUnrelateOperation extends UnrelateOperation {
  onAdd() {
    const ids = new Array(this.relation.ownerProp.size);

    this.relation.ownerProp.forEach((i) => {
      ids[i] = null;
    });

    this.ids = [ids];
    return true;
  }

  queryExecutor(builder) {
    const patch = {};
    const ownerProp = this.relation.ownerProp;

    ownerProp.forEach((i) => {
      const relatedValue = this.ids[0][i];

      if (this.owner.isModels) {
        for (const owner of this.owner.modelArray) {
          ownerProp.setProp(owner, i, relatedValue);
        }
      }

      ownerProp.patch(patch, i, relatedValue);
    });

    const ownerIdProp = this.relation.ownerModelClass.getIdRelationProperty();
    const ownerRefs = ownerIdProp.refs(builder);
    const ownerIds = this.owner.getProps(this.relation, ownerIdProp);

    const query = this.relation.ownerModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .whereInComposite(ownerRefs, ownerIds);

    // We are creating a query to the related items. So any `where` statements
    // must filter the *related* items, not the root query above, which is actually
    // for the owners.
    if (builder.has(builder.constructor.WhereSelector)) {
      query.whereExists(
        this.relation.ownerModelClass
          .relatedQuery(this.relation.name)
          .copyFrom(builder, builder.constructor.JoinSelector)
          .copyFrom(builder, builder.constructor.WhereSelector)
      );
    }

    return query;
  }
}

module.exports = {
  BelongsToOneUnrelateOperation,
};
