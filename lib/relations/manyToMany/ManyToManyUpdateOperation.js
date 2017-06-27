'use strict';

const ManyToManyUpdateOperationBase = require('./ManyToManyUpdateOperationBase');
const ManyToManyHelpersMixin = require('./ManyToManyHelpersMixin');

class ManyToManyUpdateOperation extends ManyToManyHelpersMixin(ManyToManyUpdateOperationBase) {

  onBuild(builder) {
    if (this.hasExtraProps) {
      // Create the join table patch filter query here before we add our
      // own where clauses to it. At this point `builder` should only have
      // the user's own wheres.
      this.joinTablePatchFilterQuery = this.relation.relatedModelClass
        .query()
        .childQueryOf(builder)
        .select(this.relation.fullRelatedCol(builder))
        .copyFrom(builder, builder.constructor.WhereSelector)
        .modify(this.relation.modify);
    }

    super.onBuild(builder);
    this.selectForModify(builder, this.owner).modify(this.relation.modify);
  }

  onAfter1(builder, result) {
    if (this.hasExtraProps) {
      return this.relation.joinTableModelClass(builder.knex())
        .query()
        .childQueryOf(builder)
        .whereComposite(this.relation.fullJoinTableOwnerCol(builder), this.owner.$id())
        .whereInComposite(this.relation.fullJoinTableRelatedCol(builder), this.joinTablePatchFilterQuery)
        .patch(this.joinTablePatch)
        .return(result);
    } else {
      return result;
    }
  }
}

module.exports = ManyToManyUpdateOperation;
