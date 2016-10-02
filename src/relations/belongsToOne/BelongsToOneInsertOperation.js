import InsertOperation from '../../queryBuilder/operations/InsertOperation';
import {after} from '../../utils/promiseUtils';

export default class BelongsToOneInsertOperation extends InsertOperation {

  constructor(name, opt) {
    super(name, opt);

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
        .whereComposite(this.relation.ownerModelClass.getFullIdColumn(), this.owner.$id())
        .return(inserted);
    });

  }

}
