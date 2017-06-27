'use strict';

const QueryBuilderOperation = require('../../queryBuilder/operations/QueryBuilderOperation');

class ManyToManyUnrelateOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.isWriteOperation = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  queryExecutor(builder) {
    const selectRelatedColQuery = this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .copyFrom(builder, builder.constructor.WhereSelector)
      .select(this.relation.fullRelatedCol(builder))
      .modify(this.relation.modify);

    return this.relation.joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .delete()
      .whereComposite(this.relation.fullJoinTableOwnerCol(builder), this.owner.$values(this.relation.ownerProp))
      .whereInComposite(this.relation.fullJoinTableRelatedCol(builder), selectRelatedColQuery);
  }
}

module.exports = ManyToManyUnrelateOperation;