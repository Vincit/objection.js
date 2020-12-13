'use strict';

const { normalizeIds } = require('../../utils/normalizeIds');
const { RelateOperation } = require('../../queryBuilder/operations/RelateOperation');

class BelongsToOneRelateOperation extends RelateOperation {
  onAdd(_, args) {
    this.input = args[0];
    this.ids = normalizeIds(args[0], this.relation.relatedProp, { arrayOutput: true });

    assertOneId(this.ids);
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
    const ownerIds = this.owner.getProps(this.relation, ownerIdProp);

    return this.relation.ownerModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .whereInComposite(ownerIdProp.refs(builder), ownerIds);
  }
}

function assertOneId(ids) {
  if (ids.length > 1) {
    throw new Error('can only relate one model to a BelongsToOneRelation');
  }
}

module.exports = {
  BelongsToOneRelateOperation,
};
