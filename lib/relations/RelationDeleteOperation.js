'use strict';

const DeleteOperation = require('../queryBuilder/operations/DeleteOperation');

class RelationDeleteOperation extends DeleteOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onBuild(builder) {
    super.onBuild(builder);

    this.relation.findQuery(builder, {
      ownerIds: [this.owner.$values(this.relation.ownerProp)]
    });
  }
}

module.exports = RelationDeleteOperation;