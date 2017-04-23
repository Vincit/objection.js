'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');

class DeleteOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.isWriteOperation = true;
  }

  onBuild(knexBuilder, builder) {
    knexBuilder.delete();
  }
}

module.exports = DeleteOperation;