import _ from 'lodash';
import UpdateOperation from '../queryBuilder/operations/UpdateOperation';

export default class RelationUpdateOperation extends UpdateOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onBeforeBuild(builder) {
    super.onBeforeBuild(builder);
    this.relation.findQuery(builder, [this.owner.$values(this.relation.ownerProp)]);
  }
}