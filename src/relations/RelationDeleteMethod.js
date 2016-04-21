import _ from 'lodash';
import DeleteMethod from '../queryBuilder/methods/DeleteMethod';

export default class RelationDeleteMethod extends DeleteMethod {

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