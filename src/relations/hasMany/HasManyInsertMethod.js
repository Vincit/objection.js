import _ from 'lodash';
import InsertMethod from '../../queryBuilder/methods/InsertMethod';
import {after} from '../../utils/promiseUtils';

export default class HasManyInsertMethod extends InsertMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    _.each(this.models, model => {
      _.each(this.relation.relatedProp, (relatedProp, idx) => {
        model[relatedProp] = this.owner[this.relation.ownerProp[idx]];
      });
    });

    return retVal;
  }

  onAfterModelCreateFront(builder, inserted) {
    const maybePromise = super.onAfterModelCreateFront(builder, inserted);

    return after(maybePromise, inserted => {
      this.relation.appendRelationProp(this.owner, inserted);
      return inserted;
    });
  }

}
