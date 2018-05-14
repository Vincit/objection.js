const ManyToManyModifyMixin = require('./ManyToManyModifyMixin');
const SQLITE_BUILTIN_ROW_ID = '_rowid_';

// We need to override this mixin for sqlite because sqlite doesn't support
// multi-column where in statements with subqueries. We need to use the
// internal _rowid_ column instead.
const ManyToManySqliteModifyMixin = Operation => {
  return class extends ManyToManyModifyMixin(Operation) {
    applyModifyFilterForRelatedTable(builder) {
      const tableRef = builder.tableRefFor(this.relation.relatedModelClass.getTableName());
      const rowIdRef = `${tableRef}.${SQLITE_BUILTIN_ROW_ID}`;
      const subquery = this.modifyFilterSubquery.clone().select(rowIdRef);

      return builder.whereInComposite(rowIdRef, subquery);
    }

    applyModifyFilterForJoinTable(builder) {
      const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);
      const tableRef = builder.tableRefFor(this.relation.getJoinModelClass(builder).getTableName());
      const rowIdRef = `${tableRef}.${SQLITE_BUILTIN_ROW_ID}`;

      const ownerIds = this.relation.ownerProp.getProps(this.owner);
      const subquery = this.modifyFilterSubquery.clone().select(rowIdRef);

      return builder
        .whereInComposite(rowIdRef, subquery)
        .whereComposite(joinTableOwnerRefs, ownerIds);
    }
  };
};

module.exports = ManyToManySqliteModifyMixin;
