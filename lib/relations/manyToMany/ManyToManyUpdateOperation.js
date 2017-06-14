'use strict';

const UpdateOperation = require('../../queryBuilder/operations/UpdateOperation');

class ManyToManyUpdateOperation extends UpdateOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onBuild(builder) {
    super.onBuild(builder);
    this.relation.selectForModify(builder, this.owner).modify(this.relation.modify);
  }
}

module.exports = ManyToManyUpdateOperation;
