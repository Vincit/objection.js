const UnrelateOperation = require('../../../queryBuilder/operations/UnrelateOperation');

class ManyToManyUnrelateOperationBase extends UnrelateOperation {
  queryExecutor(builder) {
    const unrelateQuery = this.relation
      .joinModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .delete();

    return this.applyModifyFilterForJoinTable(unrelateQuery);
  }
}

module.exports = ManyToManyUnrelateOperationBase;
