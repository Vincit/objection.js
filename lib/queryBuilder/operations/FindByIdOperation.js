'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');

class FindByIdOperation extends QueryBuilderOperation {
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

    builder.whereComposite(idColumn, id);
  }

  onAfter3(builder, result) {
    if (Array.isArray(result)) {
      return result[0];
    } else {
      return result;
    }
  }
}

module.exports = FindByIdOperation;
