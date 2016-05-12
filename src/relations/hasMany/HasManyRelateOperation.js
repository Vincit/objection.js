import _ from 'lodash';
import normalizeIds from '../../utils/normalizeIds';
import QueryBuilderOperation from '../../queryBuilder/operations/QueryBuilderOperation';

export default class HasManyRelateOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

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

    _.each(this.relation.relatedProp, (relatedProp, idx) => {
      patch[relatedProp] = this.owner[this.relation.ownerProp[idx]];
    });

    return this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, /where/i)
      .whereInComposite(this.relation.relatedModelClass.getFullIdColumn(), this.ids)
      .modify(this.relation.filter);
  }

  onAfterInternal() {
    return this.input;
  }
}
