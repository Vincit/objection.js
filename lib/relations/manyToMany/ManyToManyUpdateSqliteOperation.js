'use strict';

const ManyToManyUpdateOperationBase = require('./ManyToManyUpdateOperationBase');
const ManyToManySqliteHelpersMixin = require('./ManyToManySqliteHelpersMixin');
const SQLITE_BUILTIN_ROW_ID = '_rowid_';

class ManyToManyUpdateSqliteOperation extends ManyToManySqliteHelpersMixin(
  ManyToManyUpdateOperationBase
) {
  onBuild(builder) {
    if (this.hasExtraProps) {
      const joinModelClass = this.relation.joinModelClass(builder.knex());
      const joinTableName = builder.tableNameFor(joinModelClass);
      const joinTableAlias = builder.tableRefFor(joinModelClass);
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
          const joinTableRelatedProp = this.relation.joinTableRelatedProp;
          const relatedProp = this.relation.relatedProp;

          for (let i = 0, l = relatedProp.size; i < l; ++i) {
            const relatedRef = relatedProp.ref(builder, i);
            const joinTableRelatedRef = joinTableRelatedProp.ref(builder, i);

            join.on(relatedRef, joinTableRelatedRef);
          }
        })
        .modify(this.relation.modify);
    }

    super.onBuild(builder);
    this.selectForModify(builder, this.owner).modify(this.relation.modify);
  }

  onAfter1(builder, result) {
    if (this.hasExtraProps) {
      const joinModelClass = this.relation.joinModelClass(builder.knex());
      const joinTableName = builder.tableRefFor(joinModelClass);
      const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);

      return joinModelClass
        .query()
        .childQueryOf(builder)
        .whereComposite(joinTableOwnerRefs, this.owner.$id())
        .whereIn(`${joinTableName}.${SQLITE_BUILTIN_ROW_ID}`, this.joinTablePatchFilterQuery)
        .patch(this.joinTablePatch)
        .return(result);
    } else {
      return result;
    }
  }
}

module.exports = ManyToManyUpdateSqliteOperation;
