'use strict';

const { normalizeIds } = require('../../utils/normalizeIds');
const { RelateOperation } = require('../../queryBuilder/operations/RelateOperation');

class HasManyRelateOperation extends RelateOperation {
  onAdd(_, args) {
    this.input = args[0];

    this.ids = normalizeIds(args[0], this.relation.relatedModelClass.getIdRelationProperty(), {
      arrayOutput: true
    });

    assertOwnerIsSingleItem(this.owner, this.relation);
    return true;
  }

  queryExecutor(builder) {
    const patch = {};
    const relatedProp = this.relation.relatedProp;
    const ownerValues = this.owner.getSplitProps(builder, this.relation);

    for (let i = 0, l = relatedProp.size; i < l; ++i) {
      relatedProp.patch(patch, i, ownerValues[0][i]);
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

function assertOwnerIsSingleItem(owner, relation) {
  const { isModels, isIdentifiers, isQueryBuilder } = owner;
  const { ownerProp } = relation;

  const singleModel = isModels && owner.modelArray.length === 1;
  const singleId = isIdentifiers && owner.getNormalizedIdentifiers(ownerProp).length === 1;

  if (!singleModel && !singleId && !isQueryBuilder) {
    throw new Error(
      [
        'Can only relate items for one parent at a time in case of HasManyRelation.',
        'Otherwise multiple update queries would need to be created.',

        'If you need to relate items for multiple parents, simply loop through them.',
        `That's the most performant way.`
      ].join(' ')
    );
  }
}

module.exports = {
  HasManyRelateOperation
};
