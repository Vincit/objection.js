'use strict';

const { RelationInsertOperation } = require('../../RelationInsertOperation');
const { ManyToManyRelateOperation } = require('../relate/ManyToManyRelateOperation');
const { after } = require('../../../utils/promiseUtils');

class ManyToManyInsertOperation extends RelationInsertOperation {
  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);

    // Omit extra properties so that we don't try to insert
    // them to the related table. We don't actually remove them
    // from the objects, but simply mark them to be removed
    // from the inserted row.
    this.relation.omitExtraProps(this.models);

    return retVal;
  }

  onAfter1(builder, ret) {
    const maybePromise = super.onAfter1(builder, ret);

    const relateOp = new ManyToManyRelateOperation('relate', {
      dontCopyReturning: true,
      relation: this.relation,
      owner: this.owner
    });

    return after(maybePromise, inserted => {
      const modelsToRelate = inserted.filter(it => {
        return this.relation.relatedProp.hasProps(it);
      });

      if (this.assignResultToOwner && this.owner.isModels) {
        for (const owner of this.owner.modelArray) {
          owner.$appendRelated(this.relation, inserted);
        }
      }

      if (modelsToRelate.length === 0) {
        return inserted;
      }

      relateOp.onAdd(builder, [modelsToRelate]);
      return relateOp.queryExecutor(builder).then(() => inserted);
    });
  }
}

module.exports = {
  ManyToManyInsertOperation
};
