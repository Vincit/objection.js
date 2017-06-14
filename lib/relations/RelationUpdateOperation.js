'use strict';

const UpdateOperation = require('../queryBuilder/operations/UpdateOperation');

class RelationUpdateOperation extends UpdateOperation {

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

module.exports = RelationUpdateOperation;