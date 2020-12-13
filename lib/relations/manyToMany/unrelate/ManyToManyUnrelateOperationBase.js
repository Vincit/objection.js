'use strict';

const { UnrelateOperation } = require('../../../queryBuilder/operations/UnrelateOperation');

class ManyToManyUnrelateOperationBase extends UnrelateOperation {
  queryExecutor(builder) {
    const unrelateQuery = this.relation
      .getJoinModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .delete();

    return this.applyModifyFilterForJoinTable(unrelateQuery);
  }

  /* istanbul ignore next */
  applyModifyFilterForRelatedTable(builder) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  applyModifyFilterForJoinTable(builder) {
    throw new Error('not implemented');
  }
}

module.exports = {
  ManyToManyUnrelateOperationBase,
};
