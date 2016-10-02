import InsertOperation from '../../queryBuilder/operations/InsertOperation';
import {after} from '../../utils/promiseUtils';

export default class ManyToManyInsertOperation extends InsertOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    this.relation.omitExtraProps(this.models);

    return retVal;
  }

  onAfterQuery(builder, inserted) {
    const maybePromise = super.onAfterQuery(builder, inserted);

    return after(maybePromise, inserted => {
      let ownerId = this.owner.$values(this.relation.ownerProp);
      let joinModels = this.relation.createJoinModels(ownerId, inserted);

      this.owner[this.relation.name] = this.relation.mergeModels(this.owner[this.relation.name], inserted);

      // Insert the join rows to the join table.
      return this.relation.joinTableModelClass(builder.knex())
        .query()
        .childQueryOf(builder)
        .insert(joinModels)
        .return(inserted);
    });
  }

}
