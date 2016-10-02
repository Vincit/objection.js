import QueryBuilderOperation from '../../queryBuilder/operations/QueryBuilderOperation'

export default class HasManyUnrelateOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.isWriteOperation = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
    this.ids = null;
  }

  queryExecutor(builder) {
    var patch = {};

    for (let i = 0, l = this.relation.relatedProp.length; i < l; ++i) {
      patch[this.relation.relatedProp[i]] = null;
    }

    return this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, /where/i)
      .whereComposite(this.relation.fullRelatedCol(), this.owner.$values(this.relation.ownerProp))
      .modify(this.relation.modify);
  }

  onAfterInternal() {
    return {};
  }
}
