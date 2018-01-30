const ManyToManyModifyMixin = require('./ManyToManyModifyMixin');

// We need to override this mixin for mysql because mysql doesn't
// allow referencing the updated table directly in a subquery. We
// need to wrap the subquery into yet another subquery (sigh).
const ManyToManyMySqlModifyMixin = Operation => {
  return class extends ManyToManyModifyMixin(Operation) {
    applyModifyFilterForRelatedTable(builder) {
      this.modifyFilterSubquery = this.wrapIntoYetAnotherSubquery(
        builder,
        this.modifyFilterSubquery
      );

      return super.applyModifyFilterForRelatedTable(builder);
    }

    applyModifyFilterForJoinTable(builder) {
      this.modifyFilterSubquery = this.wrapIntoYetAnotherSubquery(
        builder,
        this.modifyFilterSubquery
      );

      return super.applyModifyFilterForJoinTable(builder);
    }

    wrapIntoYetAnotherSubquery(builder, modifyFilterSubquery) {
      const relatedModelClass = this.relation.relatedModelClass;
      const tableRef = builder.tableRefFor(relatedModelClass);

      return relatedModelClass
        .query()
        .childQueryOf(builder)
        .from(modifyFilterSubquery.as(tableRef));
    }
  };
};

module.exports = ManyToManyMySqlModifyMixin;
