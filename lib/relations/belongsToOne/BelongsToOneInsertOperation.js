'use strict';

const InsertOperation = require('../../queryBuilder/operations/InsertOperation');
const after = require('../../utils/promiseUtils').after;

class BelongsToOneInsertOperation extends InsertOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);

    if (this.models.length > 1) {
      throw this.relation.createError('can only insert one model to a BelongsToOneRelation');
    }

    return retVal;
  }

  onAfter1(builder, inserted) {
    const maybePromise = super.onAfter1(builder, inserted);
    const ownerProp = this.relation.ownerProp;
    const relatedProp = this.relation.relatedProp;

    return after(maybePromise, inserted => {
      this.owner[this.relation.name] = inserted[0] || null;

      const patch = {};

      for (let i = 0, l = ownerProp.size; i < l; ++i) {
        const relatedValue = relatedProp.getProp(inserted[0], i);

        ownerProp.setProp(this.owner, i, relatedValue);
        ownerProp.patch(patch, i, relatedValue);
      }

      return this.owner
        .$query()
        .childQueryOf(builder)
        .patch(patch)
        .return(inserted);
    });
  }
}

module.exports = BelongsToOneInsertOperation;
