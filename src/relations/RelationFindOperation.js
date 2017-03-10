import _ from 'lodash';
import FindOperation from '../queryBuilder/operations/FindOperation';

export default class RelationFindOperation extends FindOperation {

  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owners = opt.owners;
    this.alwaysReturnArray = false;
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
    this.createRelationProp(this.owners, related);

    if (!this.alwaysReturnArray && this.relation.isOneToOne() && related.length <= 1) {
      return related[0] || undefined;
    } else {
      return related;
    }
  }

  createRelationProp(owners, related) {
    const isOneToOne = this.relation.isOneToOne();
    const relatedByOwnerId = Object.create(null);

    for (let i = 0, l = related.length; i < l; ++i) {
      const rel = related[i];
      const key = rel.$propKey(this.relation.relatedProp);
      let arr = relatedByOwnerId[key];

      if (!arr) {
        arr = [];
        relatedByOwnerId[key] = arr;
      }

      arr.push(rel);
    }

    for (let i = 0, l = owners.length; i < l; ++i) {
      const own = owners[i];
      const key = own.$propKey(this.relation.ownerProp);
      const related = relatedByOwnerId[key];

      if (isOneToOne) {
        own[this.relation.name] = (related && related[0]) || null;
      } else {
        own[this.relation.name] = related || [];
      }
    }
  }
}

function join(arr) {
  return arr.join();
}