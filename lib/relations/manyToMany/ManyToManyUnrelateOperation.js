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
    const relatedRefs = this.relation.relatedProp.refs(builder);
    const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);
    const joinTableRelatedRefs = this.relation.joinTableRelatedProp.refs(builder);
    const ownerValues = this.relation.ownerProp.getProps(this.owner);

    const selectRelatedColQuery = this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .copyFrom(builder, builder.constructor.WhereSelector)
      .select(relatedRefs)
      .modify(this.relation.modify);

    return this.relation
      .joinModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .delete()
      .whereComposite(joinTableOwnerRefs, ownerValues)
      .whereInComposite(joinTableRelatedRefs, selectRelatedColQuery);
  }
}

module.exports = ManyToManyUnrelateOperation;
