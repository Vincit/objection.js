'use strict';

const { QueryBuilderOperation } = require('../queryBuilder/operations/QueryBuilderOperation');

class RelationSubqueryOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.relation = opt.relation;
  }

  onBuild(builder) {
    return this.relation.findQuery(builder, {
      isColumnRef: true,
      ownerIds: this.relation.ownerProp.refs(findFirstNonPartialAncestorQuery(builder))
    });
  }
}

function findFirstNonPartialAncestorQuery(builder) {
  builder = builder.parentQuery();

  while (builder.isPartial()) {
    if (!builder.parentQuery()) {
      break;
    }

    builder = builder.parentQuery();
  }

  return builder;
}

module.exports = {
  RelationSubqueryOperation
};
