import _ from 'lodash';
import DeleteOperation from '../../queryBuilder/operations/DeleteOperation';

export default class ManyToManyDeleteOperation extends DeleteOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;
  }

  onBeforeBuild(builder) {
    super.onBeforeBuild(builder);
    this.relation.selectForModify(builder, this.owner).modify(this.relation.filter);
  }
}
