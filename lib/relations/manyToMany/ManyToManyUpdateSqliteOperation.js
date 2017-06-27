'use strict';

const ManyToManyUpdateOperationBase = require('./ManyToManyUpdateOperationBase');
const ManyToManySqliteHelpersMixin = require('./ManyToManySqliteHelpersMixin');
const SQLITE_BUILTIN_ROW_ID = '_rowid_';

class ManyToManyUpdateSqliteOperation extends ManyToManySqliteHelpersMixin(ManyToManyUpdateOperationBase) {

  onBuild(builder) {
    if (this.hasExtraProps) {
      const joinTableModelClass = this.relation.joinTableModelClass(builder.knex());
      const joinTableName = builder.tableNameFor(joinTableModelClass);
      const joinTableAlias = builder.tableRefFor(joinTableModelClass);
      const joinTableAsAlias = `${joinTableName} as ${joinTableAlias}`;

      // Create the join table patch filter query here before we add our
      // own where clauses to it. At this point `builder` should only have
      // the user's own wheres.
      this.joinTablePatchFilterQuery = this.relation.relatedModelClass
        .query()
        .childQueryOf(builder)
        .select(`${joinTableAlias}.${SQLITE_BUILTIN_ROW_ID}`)
        .copyFrom(builder, builder.constructor.WhereSelector)
        .join(joinTableAsAlias, join => {
          const fullJoinTableRelatedCols = this.relation.fullJoinTableRelatedCol(builder);
          const fullRelatedCol = this.relation.fullRelatedCol(builder);

          for (let i = 0, l = fullJoinTableRelatedCols.length; i < l; ++i) {
            join.on(fullJoinTableRelatedCols[i], fullRelatedCol[i]);
          }
        })
        .modify(this.relation.modify);
    }

    super.onBuild(builder);
    this.selectForModify(builder, this.owner).modify(this.relation.modify);
  }

  onAfter1(builder, result) {
    if (this.hasExtraProps) {
      const joinTableModelClass = this.relation.joinTableModelClass(builder.knex());
      const joinTableName = builder.tableRefFor(joinTableModelClass);

      return joinTableModelClass
        .query()
        .childQueryOf(builder)
        .whereComposite(this.relation.fullJoinTableOwnerCol(builder), this.owner.$id())
        .whereIn(`${joinTableName}.${SQLITE_BUILTIN_ROW_ID}`, this.joinTablePatchFilterQuery)
        .patch(this.joinTablePatch)
        .return(result);
    } else {
      return result;
    }
  }
}

module.exports = ManyToManyUpdateSqliteOperation;
