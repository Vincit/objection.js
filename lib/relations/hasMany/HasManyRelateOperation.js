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
    this.ids = normalizeIds(args[0], this.relation.relatedModelClass.getIdPropertyArray(), {arrayOutput: true});
    return true;
  }

  queryExecutor(builder) {
    const patch = {};

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
      .whereInComposite(builder.fullIdColumnFor(this.relation.relatedModelClass), this.ids)
      .modify(this.relation.modify);
  }
}

module.exports = HasManyRelateOperation;
