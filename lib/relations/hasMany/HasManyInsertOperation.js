'use strict';

const { RelationInsertOperation } = require('../RelationInsertOperation');
const { after } = require('../../utils/promiseUtils');

class HasManyInsertOperation extends RelationInsertOperation {
  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);
    assertOwnerIsSingleItem(this.owner, this.relation);

    const ownerValues = this.owner.getSplitProps(builder, this.relation);
    const relatedProp = this.relation.relatedProp;

    for (let i = 0, lm = this.models.length; i < lm; ++i) {
      const model = this.models[i];

      for (let j = 0, lp = relatedProp.size; j < lp; ++j) {
        relatedProp.setProp(model, j, ownerValues[0][j]);
      }
    }

    return retVal;
  }

  onAfter1(builder, ret) {
    const maybePromise = super.onAfter1(builder, ret);

    if (!this.assignResultToOwner) {
      return maybePromise;
    }

    return after(maybePromise, inserted => {
      if (this.owner.isModels) {
        for (const owner of this.owner.modelArray) {
          owner.$appendRelated(this.relation, inserted);
        }
      }

      return inserted;
    });
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
        'Can only insert items for one parent at a time in case of HasManyRelation.',
        'Otherwise multiple insert queries would need to be created.',

        'If you need to insert items for multiple parents, simply loop through them.',
        `That's the most performant way.`
      ].join(' ')
    );
  }
}

module.exports = {
  HasManyInsertOperation
};
