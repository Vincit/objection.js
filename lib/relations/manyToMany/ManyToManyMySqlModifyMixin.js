'use strict';

const { ManyToManyModifyMixin } = require('./ManyToManyModifyMixin');

// We need to override this mixin for mysql because mysql doesn't
// allow referencing the updated/deleted table directly in a subquery.
// We need to wrap the subquery into yet another subquery (sigh).
const ManyToManyMySqlModifyMixin = Operation => {
  return class extends ManyToManyModifyMixin(Operation) {
    createModifyFilterSubquery(builder) {
      const modifyFilterSubquery = super.createModifyFilterSubquery(builder);
      return this.wrapIntoYetAnotherSubquery(builder, modifyFilterSubquery);
    }

    wrapIntoYetAnotherSubquery(builder, modifyFilterSubquery) {
      const relatedModelClass = this.relation.relatedModelClass;
      const tableRef = builder.tableRefFor(relatedModelClass.getTableName());

      return relatedModelClass
        .query()
        .childQueryOf(builder)
        .from(modifyFilterSubquery.as(tableRef));
    }
  };
};

module.exports = {
  ManyToManyMySqlModifyMixin
};
