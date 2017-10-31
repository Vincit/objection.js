'use strict';

module.exports = Operation =>
  class extends Operation {
    selectForModify(builder, owner) {
      const ownerValues = this.relation.ownerProp.getProps(owner);
      const joinTableRelatedRefs = this.relation.joinTableRelatedProp.refs(builder);
      const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);
      const relatedRefs = this.relation.relatedProp.refs(builder);

      const idQuery = this.relation
        .joinModelClass(builder.knex())
        .query()
        .childQueryOf(builder)
        .select(joinTableRelatedRefs)
        .whereComposite(joinTableOwnerRefs, ownerValues);

      return builder.whereInComposite(relatedRefs, idQuery);
    }
  };
