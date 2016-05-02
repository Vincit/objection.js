import _ from 'lodash';
import InsertOperation from '../../queryBuilder/operations/InsertOperation';
import {after} from '../../utils/promiseUtils';

export default class BelongsToOneInsertOperation extends InsertOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    if (this.models.length > 1) {
      this.relation.throwError('can only insert one model to a BelongsToOneRelation');
    }

    return retVal;
  }

  onAfterQuery(builder, inserted) {
    const maybePromise = super.onAfterQuery(builder, inserted);

    return after(maybePromise, inserted => {
      this.owner[this.relation.name] = inserted[0];
      let patch = {};

      _.each(this.relation.ownerProp, (ownerProp, idx) => {
        let relatedValue = inserted[0][this.relation.relatedProp[idx]];
        this.owner[ownerProp] = relatedValue;
        patch[ownerProp] = relatedValue;
      });

      return this.relation.ownerModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .whereComposite(this.relation.ownerModelClass.getFullIdColumn(), this.owner.$id())
        .return(inserted);
    });

  }

}
