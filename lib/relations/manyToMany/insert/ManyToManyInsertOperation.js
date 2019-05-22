'use strict';

const { RelationInsertOperation } = require('../../RelationInsertOperation');
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
    const owner = this.owner;

    return after(maybePromise, inserted => {
      const ownerId = this.relation.ownerProp.getProps(owner);
      const joinModelClass = this.relation.getJoinModelClass(builder.knex());

      const joinModels = this.relation.createJoinModels(
        ownerId,
        inserted.filter(it => this.relation.relatedProp.hasProps(it))
      );

      for (let i = 0, l = joinModels.length; i < l; ++i) {
        joinModels[i] = joinModelClass.fromJson(joinModels[i]);
      }

      if (this.assignResultToOwner) {
        owner.$appendRelated(this.relation, inserted);
      }

      if (joinModels.length === 0) {
        return inserted;
      }

      // Insert the join rows to the join table.
      return joinModelClass
        .query()
        .childQueryOf(builder)
        .runBefore((_, builder) =>
          this.relation.executeJoinTableBeforeInsert(joinModels, builder.context(), null)
        )
        .insert(joinModels)
        .then(() => inserted);
    });
  }
}

module.exports = {
  ManyToManyInsertOperation
};
