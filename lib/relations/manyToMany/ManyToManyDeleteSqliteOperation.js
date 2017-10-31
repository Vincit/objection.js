'use strict';

const DeleteOperation = require('../../queryBuilder/operations/DeleteOperation');
const ManyToManySqliteHelpersMixin = require('./ManyToManySqliteHelpersMixin');

class ManyToManyDeleteSqliteOperation extends ManyToManySqliteHelpersMixin(DeleteOperation) {
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

module.exports = ManyToManyDeleteSqliteOperation;
