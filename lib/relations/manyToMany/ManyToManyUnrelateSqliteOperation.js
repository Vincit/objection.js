'use strict';

const QueryBuilderOperation = require('../../queryBuilder/operations/QueryBuilderOperation');
const SQLITE_BUILTIN_ROW_ID = '_rowid_';

class ManyToManyUnrelateSqliteOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.isWriteOperation = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  queryExecutor(builder) {
    let joinTableAlias = this.relation.joinTableAlias(builder);
    let joinTableAsAlias = this.relation.joinTable + ' as ' + joinTableAlias;
    let joinTableAliasRowId = joinTableAlias + '.' + SQLITE_BUILTIN_ROW_ID;
    let joinTableRowId = this.relation.joinTable + '.' + SQLITE_BUILTIN_ROW_ID;

    let ownerId = this.owner.$values(this.relation.ownerProp);
    let fullRelatedCol = this.relation.fullRelatedCol(builder);

    let selectRelatedQuery = this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .copyFrom(builder, /where/i)
      .select(joinTableAliasRowId)
      .modify(this.relation.modify)
      .whereComposite(this.relation.fullJoinTableOwnerCol(builder), ownerId)
      .join(joinTableAsAlias, join => {
        const fullJoinTableRelatedCol = this.relation.fullJoinTableRelatedCol(builder);

        for (let i = 0, l = fullJoinTableRelatedCol.length; i < l; ++i) {
          join.on(fullJoinTableRelatedCol[i], fullRelatedCol[i]);
        }
      });

    return this.relation.joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .delete()
      .whereIn(joinTableRowId, selectRelatedQuery);
  }
}

module.exports = ManyToManyUnrelateSqliteOperation;
