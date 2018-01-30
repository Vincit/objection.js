const QueryBuilderOperation = require('./QueryBuilderOperation');

class FindByIdsOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.ids = null;
  }

  onAdd(builder, args) {
    this.ids = args[0];
    return super.onAdd(builder, args);
  }

  onBuild(builder) {
    const idColumn = builder.fullIdColumnFor(builder.modelClass());
    builder.whereInComposite(idColumn, this.ids);
  }

  onAfter3(builder, result) {
    return result;
  }
}

module.exports = FindByIdsOperation;
