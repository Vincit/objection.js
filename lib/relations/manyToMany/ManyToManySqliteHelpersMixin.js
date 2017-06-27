'use strict';

const SQLITE_BUILTIN_ROW_ID = '_rowid_';

module.exports = (Operation) => class extends Operation {

  selectForModify(builder, owner) {
    const relatedTable = builder.tableNameFor(this.relation.relatedModelClass);
    const relatedTableAlias = this.relation.relatedTableAlias(builder);
    const relatedTableAsAlias = `${relatedTable} as ${relatedTableAlias}`;
    const relatedTableAliasRowId = `${relatedTableAlias}.${SQLITE_BUILTIN_ROW_ID}`;
    const relatedTableRowId = `${relatedTable}.${SQLITE_BUILTIN_ROW_ID}`;

    const selectRelatedQuery = this.relation.joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .select(relatedTableAliasRowId)
      .whereComposite(this.relation.fullJoinTableOwnerCol(builder), owner.$values(this.relation.ownerProp))
      .join(relatedTableAsAlias, join => {
        const fullJoinTableRelatedCols = this.relation.fullJoinTableRelatedCol(builder);
        const fullRelatedCol = this.relation.fullRelatedCol(builder);

        for (let i = 0, l = fullJoinTableRelatedCols.length; i < l; ++i) {
          join.on(fullJoinTableRelatedCols[i], fullRelatedCol[i]);
        }
      });

    return builder.whereInComposite(relatedTableRowId, selectRelatedQuery);
  }
}