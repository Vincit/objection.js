import _ from 'lodash';
import QueryBuilderOperation from '../../queryBuilder/operations/QueryBuilderOperation';

const sqliteBuiltInRowId = '_rowid_';

export default class ManyToManyUnrelateSqliteOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

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
      .modify(this.relation.filter)
      .whereComposite(this.relation.fullJoinTableOwnerCol(), ownerId)
      .join(joinTableAsAlias, join => {
        _.each(this.relation.fullJoinTableRelatedCol(), (joinTableRelatedCol, idx) => {
          join.on(joinTableRelatedCol, fullRelatedCol[idx]);
        });
      });

    return this.relation.joinTableModelClass
      .bindKnex(builder.knex())
      .query()
      .childQueryOf(builder)
      .delete()
      .whereIn(joinTableRowId, selectRelatedQuery)
      .runAfter(_.constant({}));
  }
}
