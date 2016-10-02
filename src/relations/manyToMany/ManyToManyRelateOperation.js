import normalizeIds from '../../utils/normalizeIds';
import QueryBuilderOperation from '../../queryBuilder/operations/QueryBuilderOperation';

export default class ManyToManyRelateOperation extends QueryBuilderOperation {

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
    this.ids = normalizeIds(args[0], this.relation.relatedProp);
    return true;
  }

  queryExecutor(builder) {
    let joinModels = this.relation.createJoinModels(this.owner.$values(this.relation.ownerProp), this.ids);

    return this.relation.joinTableModelClass(builder.knex())
      .query()
      .childQueryOf(builder)
      .insert(joinModels);
  }

  onAfterInternal() {
    return this.input;
  }
}
