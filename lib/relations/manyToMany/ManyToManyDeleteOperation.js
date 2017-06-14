'use strict';

const DeleteOperation = require('../../queryBuilder/operations/DeleteOperation');

class ManyToManyDeleteOperation extends DeleteOperation {

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

module.exports = ManyToManyDeleteOperation;
