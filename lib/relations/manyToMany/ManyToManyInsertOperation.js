'use strict';

const InsertOperation = require('../../queryBuilder/operations/InsertOperation');
const after = require('../../utils/promiseUtils').after;

class ManyToManyInsertOperation extends InsertOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    this.relation.omitExtraProps(this.models);

    return retVal;
  }

  onAfterQuery(builder, inserted) {
    const maybePromise = super.onAfterQuery(builder, inserted);

    const isOneToOne = this.relation.isOneToOne();
    const relName = this.relation.name;
    const owner = this.owner;

    return after(maybePromise, inserted => {
      let ownerId = this.owner.$values(this.relation.ownerProp);
      let joinModels = this.relation.createJoinModels(ownerId, inserted);

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
