'use strict';

const InsertOperation = require('../../queryBuilder/operations/InsertOperation');
const after = require('../../utils/promiseUtils').after;

class HasManyInsertOperation extends InsertOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onAdd(builder, args) {
    const retVal = super.onAdd(builder, args);
    const ownerProp = this.relation.ownerProp;
    const relatedProp = this.relation.relatedProp;

    for (let i = 0, lm = this.models.length; i < lm; ++i) {
      const model = this.models[i];

      for (let j = 0, lp = relatedProp.size; j < lp; ++j) {
        relatedProp.setProp(model, j, ownerProp.getProp(this.owner, j));
      }
    }

    return retVal;
  }

  onAfter1(builder, inserted) {
    const maybePromise = super.onAfter1(builder, inserted);

    const isOneToOne = this.relation.isOneToOne();
    const relName = this.relation.name;
    const owner = this.owner;

    return after(maybePromise, inserted => {
      if (isOneToOne) {
        owner[relName] = inserted[0] || null;
      } else {
        owner[relName] = this.relation.mergeModels(owner[relName], inserted);
      }

      return inserted;
    });
  }
}

module.exports = HasManyInsertOperation;
