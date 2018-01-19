const QueryBuilderOperation = require('./QueryBuilderOperation');

class DeleteOperation extends QueryBuilderOperation {
  onBuildKnex(knexBuilder) {
    knexBuilder.delete();
  }
}

module.exports = DeleteOperation;
