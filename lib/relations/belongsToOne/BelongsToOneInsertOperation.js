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
      this.relation.throwError('can only insert one model to a BelongsToOneRelation');
    }

    return retVal;
  }

  onAfter1(builder, inserted) {
    const maybePromise = super.onAfter1(builder, inserted);

    return after(maybePromise, inserted => {
      this.owner[this.relation.name] = inserted[0] || null;
      let patch = {};

      for (let i = 0, l = this.relation.ownerProp.length; i < l; ++i) {
        const ownerProp = this.relation.ownerProp[i];
        const relatedProp = this.relation.relatedProp[i];
        const relatedValue = inserted[0][relatedProp];

        this.owner[ownerProp] = inserted[0][relatedProp];
        patch[ownerProp] = relatedValue;
      }

      return this.relation.ownerModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .whereComposite(builder.fullIdColumnFor(this.relation.ownerModelClass), this.owner.$id())
        .return(inserted);
    });

  }

}

module.exports = BelongsToOneInsertOperation;
