'use strict';

const DeleteOperation = require('../../queryBuilder/operations/DeleteOperation');
const ManyToManyHelpersMixin = require('./ManyToManyHelpersMixin');

class ManyToManyDeleteOperation extends ManyToManyHelpersMixin(DeleteOperation) {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onBuild(builder) {
    super.onBuild(builder);
    this.selectForModify(builder, this.owner).modify(this.relation.modify);
  }
}

module.exports = ManyToManyDeleteOperation;
