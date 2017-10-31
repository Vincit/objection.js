'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');

class DeleteOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.isWriteOperation = true;
  }

  onBuildKnex(knexBuilder) {
    knexBuilder.delete();
  }
}

module.exports = DeleteOperation;
