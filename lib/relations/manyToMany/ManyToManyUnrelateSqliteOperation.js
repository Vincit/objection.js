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
    const joinTableAlias = this.relation.joinTableAlias(builder);
    const joinTableAsAlias = this.relation.joinTable + ' as ' + joinTableAlias;
    const joinTableAliasRowId = joinTableAlias + '.' + SQLITE_BUILTIN_ROW_ID;
    const joinTableRowId = this.relation.joinTable + '.' + SQLITE_BUILTIN_ROW_ID;

    const ownerId = this.relation.ownerProp.getProps(this.owner);
    const relatedRefs = this.relation.relatedProp.refs(builder);
    const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);

    const selectRelatedQuery = this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .copyFrom(builder, /where/i)
      .select(joinTableAliasRowId)
      .modify(this.relation.modify)
      .whereComposite(joinTableOwnerRefs, ownerId)
      .join(joinTableAsAlias, join => {
        const relatedProp = this.relation.relatedProp;
        const joinTableRelatedProp = this.relation.joinTableRelatedProp;

        for (let i = 0, l = relatedProp.size; i < l; ++i) {
          const relatedRef = relatedProp.ref(builder, i);
          const joinTableRelatedRef = joinTableRelatedProp.ref(builder, i);

          join.on(relatedRef, joinTableRelatedRef);
        }
      });

    return this.relation
      .joinModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .delete()
      .whereIn(joinTableRowId, selectRelatedQuery);
  }
}

module.exports = ManyToManyUnrelateSqliteOperation;
