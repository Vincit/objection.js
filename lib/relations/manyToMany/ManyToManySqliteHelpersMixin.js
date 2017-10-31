'use strict';

const SQLITE_BUILTIN_ROW_ID = '_rowid_';

module.exports = Operation =>
  class extends Operation {
    selectForModify(builder, owner) {
      const relatedTable = builder.tableNameFor(this.relation.relatedModelClass);
      const relatedTableAlias = this.relation.relatedTableAlias(builder);
      const relatedTableAsAlias = `${relatedTable} as ${relatedTableAlias}`;
      const relatedTableAliasRowId = `${relatedTableAlias}.${SQLITE_BUILTIN_ROW_ID}`;
      const relatedTableRowId = `${relatedTable}.${SQLITE_BUILTIN_ROW_ID}`;

      const ownerValues = this.relation.ownerProp.getProps(owner);
      const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);

      const selectRelatedQuery = this.relation
        .joinModelClass(builder.knex())
        .query()
        .childQueryOf(builder)
        .select(relatedTableAliasRowId)
        .whereComposite(joinTableOwnerRefs, ownerValues)
        .join(relatedTableAsAlias, join => {
          const joinTableRelatedProp = this.relation.joinTableRelatedProp;
          const relatedProp = this.relation.relatedProp;

          for (let i = 0, l = relatedProp.size; i < l; ++i) {
            const joinTableRelatedRef = joinTableRelatedProp.ref(builder, i);
            const relatedRef = relatedProp.ref(builder, i);

            join.on(joinTableRelatedRef, relatedRef);
          }
        });

      return builder.whereInComposite(relatedTableRowId, selectRelatedQuery);
    }
  };
