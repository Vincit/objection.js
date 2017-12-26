const QueryBuilderOperation = require('./QueryBuilderOperation');

class DeleteByIdOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);
    this.id = null;
  }

  onAdd(builder, args) {
    this.id = args[0];
    return super.onAdd(builder, args);
  }

  onBuild(builder) {
    const idColumn = builder.fullIdColumnFor(builder.modelClass());
    const id = this.id;

    builder.whereComposite(idColumn, id).delete();
  }
}

module.exports = DeleteByIdOperation;
