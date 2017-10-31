'use strict';

const normalizeIds = require('../../utils/normalizeIds');
const QueryBuilderOperation = require('../../queryBuilder/operations/QueryBuilderOperation');

class HasManyRelateOperation extends QueryBuilderOperation {
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
    this.ids = normalizeIds(args[0], this.relation.relatedModelClass.getIdRelationProperty(), {
      arrayOutput: true
    });
    return true;
  }

  queryExecutor(builder) {
    const patch = {};
    const ownerProp = this.relation.ownerProp;
    const relatedProp = this.relation.relatedProp;
    const idColumn = builder.fullIdColumnFor(this.relation.relatedModelClass);

    for (let i = 0, l = relatedProp.size; i < l; ++i) {
      relatedProp.patch(patch, i, ownerProp.getProp(this.owner, i));
    }

    return this.relation.relatedModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, builder.constructor.WhereSelector)
      .whereInComposite(idColumn, this.ids)
      .modify(this.relation.modify);
  }
}

module.exports = HasManyRelateOperation;
