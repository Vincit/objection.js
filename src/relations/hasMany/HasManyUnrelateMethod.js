import _ from 'lodash';
import QueryBuilderMethod from '../../queryBuilder/methods/QueryBuilderMethod'

export default class HasManyUnrelateMethod extends QueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.isWriteMethod = true;
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
      .call(this.relation.filter);
  }

  onAfterModelCreate() {
    return {};
  }
}
