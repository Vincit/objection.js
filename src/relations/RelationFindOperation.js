import _ from 'lodash';
import FindOperation from '../queryBuilder/operations/FindOperation';

export default class RelationFindOperation extends FindOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owners = opt.owners;
  }

  onBeforeBuild(builder) {
    let ids = new Array(this.owners.length);

    for (let i = 0, l = this.owners.length; i < l; ++i) {
      ids[i] = this.owners[i].$values(this.relation.ownerProp);
    }

    this.relation.findQuery(builder, {
      ownerIds: _.uniqBy(ids, join)
    });
  }

  onAfterInternal(builder, related) {
    this.relation.createRelationProp(this.owners, related);

    return related;
  }
}

function join(arr) {
  return arr.join();
}