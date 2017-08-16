'use strict';

const InsertOperation = require('../../queryBuilder/operations/InsertOperation');
const after = require('../../utils/promiseUtils').after;

class ManyToManyInsertOperation extends InsertOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

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
      const ownerId = this.owner.$values(this.relation.ownerProp);
      const joinModels = this.relation.createJoinModels(ownerId, inserted);

      if (isOneToOne) {
        owner[relName] = inserted[0] || null;
      } else {
        owner[relName] = this.relation.mergeModels(owner[relName], inserted);
      }

      // Insert the join rows to the join table.
      return this.relation.joinTableModelClass(builder.knex())
        .query()
        .childQueryOf(builder)
        .insert(joinModels)
        .return(inserted);
    });
  }

}

module.exports = ManyToManyInsertOperation;
