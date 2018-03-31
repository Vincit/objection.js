const QueryBuilderOperation = require('../queryBuilder/operations/QueryBuilderOperation');

class RelationSubqueryOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.relation = opt.relation;
  }

  onBuild(builder) {
    return this.relation.findQuery(builder, {
      isColumnRef: true,
      ownerIds: this.relation.ownerProp.refs(builder.parentQuery())
    });
  }
}

module.exports = RelationSubqueryOperation;
