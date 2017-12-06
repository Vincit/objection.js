'use strict';

const after = require('../utils/promiseUtils').after;
const InsertOperation = require('../queryBuilder/operations/InsertOperation');

class RelationInsertOperation extends InsertOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onBefore2(builder, result) {
    const maybePromise = super.onBefore2(builder, result);
    const queryContext = builder.context();

    return after(maybePromise, result =>
      this.relation.executeBeforeInsert(this.models, queryContext, result)
    );
  }
}

module.exports = RelationInsertOperation;
