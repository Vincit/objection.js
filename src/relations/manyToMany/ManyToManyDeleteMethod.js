import _ from 'lodash';
import DeleteMethod from '../../queryBuilder/methods/DeleteMethod';

export default class ManyToManyDeleteMethod extends DeleteMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onBeforeBuild(builder) {
    super.onBeforeBuild(builder);
    this.relation.selectForModify(builder, this.owner).call(this.relation.filter);
  }
}
