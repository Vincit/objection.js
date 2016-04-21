import _ from 'lodash';
import QueryBuilderMethod from '../queryBuilder/methods/QueryBuilderMethod';

export default class RelationFindMethod extends QueryBuilderMethod {

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

  onAfterModelCreate(builder, related) {
    this.relation.createRelationProp(this.owners, related);
    return related;
  }
}