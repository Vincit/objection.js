import normalizeIds from '../../utils/normalizeIds';
import QueryBuilderOperation from '../../queryBuilder/operations/QueryBuilderOperation';

export default class HasManyRelateOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.isWriteOperation = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
    this.input = null;
    this.ids = null;
  }

  call(builder, args) {
    this.input = args[0];
    this.ids = normalizeIds(args[0], this.relation.relatedModelClass.getIdPropertyArray(), {arrayOutput: true});
    return true;
  }

  queryExecutor(builder) {
    var patch = {};

    for (let i = 0, l = this.relation.relatedProp.length; i < l; ++i) {
      const relatedProp = this.relation.relatedProp[i];
      const ownerProp = this.relation.ownerProp[i];

      patch[relatedProp] = this.owner[ownerProp];
    }

    return this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, /where/i)
      .whereInComposite(this.relation.relatedModelClass.getFullIdColumn(), this.ids)
      .modify(this.relation.modify);
  }

  onAfterInternal() {
    return this.input;
  }
}
