'use strict';

const { InsertOperation } = require('../queryBuilder/operations/InsertOperation');

class RelationInsertOperation extends InsertOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
    this.assignResultToOwner = true;
  }

  async onBefore2(builder, result) {
    const queryContext = builder.context();
    result = await this.relation.executeBeforeInsert(this.models, queryContext, result);
    return super.onBefore2(builder, result);
  }

  clone() {
    const clone = super.clone();

    clone.relation = this.relation;
    clone.owner = this.owner;
    clone.assignResultToOwner = this.assignResultToOwner;

    return clone;
  }
}

module.exports = {
  RelationInsertOperation
};
