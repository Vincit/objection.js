'use strict';

const RelationInsertOperation = require('../RelationInsertOperation');
const after = require('../../utils/promiseUtils').after;

class ManyToManyInsertOperation extends RelationInsertOperation {
  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);

    this.relation.omitExtraProps(this.models, this.queryProps);

    return retVal;
  }

  onAfter1(builder, inserted) {
    const maybePromise = super.onAfter1(builder, inserted);

    const isOneToOne = this.relation.isOneToOne();
    const relName = this.relation.name;
    const owner = this.owner;

    return after(maybePromise, inserted => {
      const ownerId = this.relation.ownerProp.getProps(this.owner);
      const joinModels = this.relation.createJoinModels(ownerId, inserted);
      const joinModelClass = this.relation.joinModelClass(builder.knex());

      if (isOneToOne) {
        owner[relName] = inserted[0] || null;
      } else {
        owner[relName] = this.relation.mergeModels(owner[relName], inserted);
      }

      for (let i = 0, l = joinModels.length; i < l; ++i) {
        joinModels[i] = joinModelClass.fromJson(joinModels[i]);
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

module.exports = ManyToManyInsertOperation;
