import _ from 'lodash';
import QueryBuilderOperation from '../../queryBuilder/operations/QueryBuilderOperation'

export default class HasManyUnrelateOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.isWriteOperation = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
    this.ids = null;
  }

  queryExecutor(builder) {
    var patch = {};

    _.each(this.relation.relatedProp, relatedProp => {
      patch[relatedProp] = null;
    });

    return this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, /where/i)
      .whereComposite(this.relation.fullRelatedCol(), this.owner.$values(this.relation.ownerProp))
      .modify(this.relation.filter);
  }

  onAfterInternal() {
    return {};
  }
}
