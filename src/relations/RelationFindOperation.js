import _ from 'lodash';
import FindOperation from '../queryBuilder/operations/FindOperation';

export default class RelationFindOperation extends FindOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.relation = opt.relation;
    this.owners = opt.owners;
  }

  onBeforeBuild(builder) {
    this.relation.findQuery(builder, _(this.owners)
      .map(owner => owner.$values(this.relation.ownerProp))
      .uniqBy(id => id.join())
      .value());
  }

  onAfterInternal(builder, related) {
    this.relation.createRelationProp(this.owners, related);
    return related;
  }
}