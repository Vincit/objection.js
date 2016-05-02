import _ from 'lodash';
import InsertOperation from '../../queryBuilder/operations/InsertOperation';
import {after} from '../../utils/promiseUtils';

export default class HasManyInsertOperation extends InsertOperation {

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

  onAfterQuery(builder, inserted) {
    const maybePromise = super.onAfterQuery(builder, inserted);

    return after(maybePromise, inserted => {
      this.relation.appendRelationProp(this.owner, inserted);
      return inserted;
    });
  }

}
