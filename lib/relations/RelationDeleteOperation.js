'use strict';

const { DeleteOperation } = require('../queryBuilder/operations/DeleteOperation');

class RelationDeleteOperation extends DeleteOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onBuild(builder) {
    super.onBuild(builder);
    this.relation.findQuery(builder, this.owner);
  }
}

module.exports = {
  RelationDeleteOperation
};
