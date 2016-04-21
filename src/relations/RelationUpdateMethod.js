import _ from 'lodash';
import UpdateMethod from '../queryBuilder/methods/UpdateMethod';

export default class RelationUpdateMethod extends UpdateMethod {

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