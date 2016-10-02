import InsertOperation from '../../queryBuilder/operations/InsertOperation';
import {after} from '../../utils/promiseUtils';

export default class HasManyInsertOperation extends InsertOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    for (let i = 0, lm = this.models.length; i < lm; ++i) {
      const model = this.models[i];

      for (let j = 0, lp = this.relation.relatedProp.length; j < lp; ++j) {
        const relatedProp = this.relation.relatedProp[j];
        const ownerProp = this.relation.ownerProp[j];

        model[relatedProp] = this.owner[ownerProp];
      }
    }

    return retVal;
  }

  onAfterQuery(builder, inserted) {
    const maybePromise = super.onAfterQuery(builder, inserted);

    return after(maybePromise, inserted => {
      this.relation.appendRelationProp(this.owner, inserted);
      return inserted;
    });
  }

}
