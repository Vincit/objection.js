'use strict';

const normalizeIds = require('../../utils/normalizeIds');
const QueryBuilderOperation = require('../../queryBuilder/operations/QueryBuilderOperation');

class BelongsToOneRelateOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.isWriteOperation = true;
    this.relation = opt.relation;
    this.owner = opt.owner;
    this.input = null;
    this.ids = null;
  }

  onAdd(builder, args) {
    this.input = args[0];
    this.ids = normalizeIds(args[0], this.relation.relatedProp, {arrayOutput: true});

    if (this.ids.length > 1) {
      throw this.relation.createError('can only relate one model to a BelongsToOneRelation');
    }

    return true;
  }

  queryExecutor(builder) {
    const patch = {};
    const ownerProp = this.relation.ownerProp;
    const idColumn = builder.fullIdColumnFor(this.relation.ownerModelClass);

    for (let i = 0, l = ownerProp.size; i < l; ++i) {
      const relatedValue = this.ids[0][i];

      ownerProp.setProp(this.owner, i, relatedValue);
      ownerProp.patch(patch, i, relatedValue);
    }

    return this.relation.ownerModelClass
      .query()
      .childQueryOf(builder)
      .copyFrom(builder, builder.constructor.WhereSelector)
      .patch(patch)
      .whereComposite(idColumn, this.owner.$id());
  }
}

module.exports = BelongsToOneRelateOperation;
