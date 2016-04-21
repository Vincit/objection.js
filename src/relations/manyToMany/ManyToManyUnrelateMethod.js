import _ from 'lodash';
import QueryBuilderMethod from '../../queryBuilder/methods/QueryBuilderMethod';

export default class ManyToManyUnrelateMethod extends QueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.isWriteMethod = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  queryExecutor(builder) {
    let selectRelatedColQuery = this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .copyFrom(builder, /where/i)
      .select(this.relation.fullRelatedCol())
      .call(this.relation.filter);

    return this.relation.joinTableModelClass
      .bindKnex(builder.knex())
      .query()
      .childQueryOf(builder)
      .delete()
      .whereComposite(this.relation.fullJoinTableOwnerCol(), this.owner.$values(this.relation.ownerProp))
      .whereInComposite(this.relation.fullJoinTableRelatedCol(), selectRelatedColQuery)
      .runAfter(_.constant({}));
  }
}
