const QueryBuilderOperation = require('./QueryBuilderOperation');

module.exports = class DeleteOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.isWriteOperation = true;
  }

  onBuild(knexBuilder, builder) {
    knexBuilder.delete();
  }
}
