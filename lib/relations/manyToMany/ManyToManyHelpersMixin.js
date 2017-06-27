'use strict';

module.exports = (Operation) => class extends Operation {

  selectForModify(builder, owner) {
    const ownerId = owner.$values(this.relation.ownerProp);

    const idQuery = this.relation.joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .select(this.relation.fullJoinTableRelatedCol(builder))
      .whereComposite(this.relation.fullJoinTableOwnerCol(builder), ownerId);

    return builder.whereInComposite(this.relation.fullRelatedCol(builder), idQuery);
  }
}