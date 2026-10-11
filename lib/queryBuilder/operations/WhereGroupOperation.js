'use strict';

const { QueryBuilderOperation } = require('./QueryBuilderOperation');

// Builds a set of where operations inside a single knex `where(callback)`
// group, i.e. wraps them in parentheses. See `getWhereGroupOperations()`.
class WhereGroupOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.operations = opt.operations;
  }

  onBuildKnex(knexBuilder, builder) {
    const operations = this.operations;

    return knexBuilder.where(function () {
      let knex = this;

      const build = (op) => {
        if (op.hasOnBuildKnex()) {
          knex = builder.callOperationMethod(op, 'onBuildKnex', [knex, builder]) || knex;
        }
      };

      for (const op of operations) {
        build(op);
        op.forEachDescendantOperation(build);
      }
    });
  }
}

module.exports = {
  WhereGroupOperation,
};
