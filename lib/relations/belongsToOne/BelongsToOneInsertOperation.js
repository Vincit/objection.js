'use strict';

const { RelationInsertOperation } = require('../RelationInsertOperation');
const { BelongsToOneRelateOperation } = require('./BelongsToOneRelateOperation');
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

    const relateOp = new BelongsToOneRelateOperation('relate', {
      relation: this.relation,
      owner: this.owner
    });

    return after(maybePromise, inserted => {
      if (!builder.isExecutable()) {
        return inserted;
      }

      if (this.assignResultToOwner && this.owner.isModels) {
        for (const owner of this.owner.modelArray) {
          owner.$setRelated(this.relation, inserted);
        }
      }

      relateOp.onAdd(builder, [inserted]);
      return relateOp.queryExecutor(builder).then(() => inserted);
    });
  }
}

module.exports = {
  BelongsToOneInsertOperation
};
