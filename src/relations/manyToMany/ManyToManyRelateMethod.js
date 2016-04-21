import _ from 'lodash';
import normalizeIds from '../../utils/normalizeIds';
import QueryBuilderMethod from '../../queryBuilder/methods/QueryBuilderMethod';

export default class ManyToManyRelateMethod extends QueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.isWriteMethod = true;
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

    return this.relation.joinTableModelClass
      .bindKnex(builder.knex())
      .query()
      .childQueryOf(builder)
      .insert(joinModels);
  }

  onAfterModelCreate() {
    return this.input;
  }
}
