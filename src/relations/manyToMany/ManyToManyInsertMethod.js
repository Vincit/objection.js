import _ from 'lodash';
import InsertMethod from '../../queryBuilder/methods/InsertMethod';
import {after} from '../../utils/promiseUtils';

export default class ManyToManyInsertMethod extends InsertMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    this.relation.omitExtraProps(this.models);

    return retVal;
  }

  onAfterModelCreateFront(builder, inserted) {
    const maybePromise = super.onAfterModelCreateFront(builder, inserted);

    return after(maybePromise, inserted => {
      let ownerId = this.owner.$values(this.relation.ownerProp);
      let joinModels = this.relation.createJoinModels(ownerId, inserted);

      this.owner[this.relation.name] = this.relation.mergeModels(this.owner[this.relation.name], inserted);

      // Insert the join rows to the join table.
      return this.relation.joinTableModelClass
        .bindKnex(builder.knex())
        .query()
        .childQueryOf(builder)
        .insert(joinModels)
        .return(inserted);
    });
  }

}
