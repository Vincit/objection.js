'use strict';

const { RelationInsertOperation } = require('../../RelationInsertOperation');
const { after } = require('../../../utils/promiseUtils');

class ManyToManyInsertOperation extends RelationInsertOperation {
  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);
    this.relation.omitExtraProps(this.models);
    return retVal;
  }

  onAfter1(builder, ret) {
    const maybePromise = super.onAfter1(builder, ret);
    const owner = this.owner;

    return after(maybePromise, inserted => {
      const ownerId = this.relation.ownerProp.getProps(owner);
      const joinModels = this.relation.createJoinModels(ownerId, inserted);
      const joinModelClass = this.relation.getJoinModelClass(builder.knex());

      for (let i = 0, l = joinModels.length; i < l; ++i) {
        joinModels[i] = joinModelClass.fromJson(joinModels[i]);
      }

      if (this.assignResultToOwner) {
        owner.$appendRelated(this.relation, inserted);
      }

      // Insert the join rows to the join table.
      return joinModelClass
        .query()
        .childQueryOf(builder)
        .runBefore((result, builder) =>
          this.relation.executeJoinTableBeforeInsert(joinModels, builder.context(), null)
        )
        .insert(joinModels)
        .return(inserted);
    });
  }
}

module.exports = {
  ManyToManyInsertOperation
};
