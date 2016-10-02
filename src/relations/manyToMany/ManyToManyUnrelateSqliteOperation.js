import _ from 'lodash';
import QueryBuilderOperation from '../../queryBuilder/operations/QueryBuilderOperation';

const sqliteBuiltInRowId = '_rowid_';

export default class ManyToManyUnrelateSqliteOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.isWriteOperation = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  queryExecutor(builder) {
    let joinTableAlias = this.relation.joinTableAlias();
    let joinTableAsAlias = this.relation.joinTable + ' as ' + joinTableAlias;
    let joinTableAliasRowId = joinTableAlias + '.' + sqliteBuiltInRowId;
    let joinTableRowId = this.relation.joinTable + '.' + sqliteBuiltInRowId;

    let ownerId = this.owner.$values(this.relation.ownerProp);
    let fullRelatedCol = this.relation.fullRelatedCol();

    let selectRelatedQuery = this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .copyFrom(builder, /where/i)
      .select(joinTableAliasRowId)
      .modify(this.relation.modify)
      .whereComposite(this.relation.fullJoinTableOwnerCol(), ownerId)
      .join(joinTableAsAlias, join => {
        const fullJoinTableRelatedCol = this.relation.fullJoinTableRelatedCol();

        for (let i = 0, l = fullJoinTableRelatedCol.length; i < l; ++i) {
          join.on(fullJoinTableRelatedCol[i], fullRelatedCol[i]);
        }
      });

    return this.relation.joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .delete()
      .whereIn(joinTableRowId, selectRelatedQuery)
      .runAfter(_.constant({}));
  }
}
