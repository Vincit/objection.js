const normalizeIds = require('../../utils/normalizeIds');
const RelateOperation = require('../../queryBuilder/operations/RelateOperation');

class HasManyRelateOperation extends RelateOperation {
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
