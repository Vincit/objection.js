'use strict';

const { RelationInsertOperation } = require('../RelationInsertOperation');
const { after } = require('../../utils/promiseUtils');

class BelongsToOneInsertOperation extends RelationInsertOperation {
  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);

    if (this.models.length > 1) {
      throw this.relation.createError('can only insert one model to a BelongsToOneRelation');
    }

    return retVal;
  }

  onAfter1(builder, ret) {
    const maybePromise = super.onAfter1(builder, ret);
    const owner = this.owner;

    const ownerProp = this.relation.ownerProp;
    const relatedProp = this.relation.relatedProp;

    return after(maybePromise, inserted => {
      const patch = {};

      for (let i = 0, l = ownerProp.size; i < l; ++i) {
        const relatedValue = relatedProp.getProp(inserted[0], i);

        ownerProp.setProp(this.owner, i, relatedValue);
        ownerProp.patch(patch, i, relatedValue);
      }

      if (this.assignResultToOwner) {
        owner.$setRelated(this.relation, inserted);
      }

      return this.owner
        .$query()
        .childQueryOf(builder)
        .patch(patch)
        .return(inserted);
    });
  }
}

module.exports = {
  BelongsToOneInsertOperation
};
