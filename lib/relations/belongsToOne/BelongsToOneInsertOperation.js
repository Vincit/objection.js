'use strict';

const { RelationInsertOperation } = require('../RelationInsertOperation');
const { BelongsToOneRelateOperation } = require('./BelongsToOneRelateOperation');

class BelongsToOneInsertOperation extends RelationInsertOperation {
  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);

    if (this.models.length > 1) {
      throw this.relation.createError('can only insert one model to a BelongsToOneRelation');
    }

    return retVal;
  }

  async onAfter1(builder, ret) {
    const inserted = await super.onAfter1(builder, ret);

    if (!builder.isExecutable()) {
      return inserted;
    }

    const relateOp = new BelongsToOneRelateOperation('relate', {
      relation: this.relation,
      owner: this.owner,
    });

    if (this.assignResultToOwner && this.owner.isModels) {
      for (const owner of this.owner.modelArray) {
        owner.$setRelated(this.relation, inserted);
      }
    }

    relateOp.onAdd(builder, [inserted]);
    await relateOp.queryExecutor(builder);

    return inserted;
  }
}

module.exports = {
  BelongsToOneInsertOperation,
};
