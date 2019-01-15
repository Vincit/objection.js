'use strict';

const { normalizeIds } = require('../../utils/normalizeIds');
const { RelateOperation } = require('../../queryBuilder/operations/RelateOperation');

class HasManyRelateOperation extends RelateOperation {
  onAdd(_, args) {
    this.input = args[0];
    this.ids = normalizeIds(args[0], this.relation.relatedModelClass.getIdRelationProperty(), {
      arrayOutput: true
    });
    return true;
  }

  queryExecutor(builder) {
    const patch = {};
    const ownerProp = this.relation.ownerProp;
    const relatedProp = this.relation.relatedProp;

    for (let i = 0, l = relatedProp.size; i < l; ++i) {
      relatedProp.patch(patch, i, ownerProp.getProp(this.owner, i));
    }

    return this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, builder.constructor.JoinSelector)
      .copyFrom(builder, builder.constructor.WhereSelector)
      .findByIds(this.ids)
      .modify(this.relation.modify);
  }
}

module.exports = {
  HasManyRelateOperation
};
