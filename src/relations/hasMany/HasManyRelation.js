import Relation from '../Relation';

import HasManyInsertOperation from './HasManyInsertOperation';
import HasManyRelateOperation from './HasManyRelateOperation';
import HasManyUnrelateOperation from './HasManyUnrelateOperation';

export default class HasManyRelation extends Relation {

  createRelationProp(owners, related) {
    let relatedByOwnerId = Object.create(null);

    for (let i = 0, l = related.length; i < l; ++i) {
      const rel = related[i];
      const key = rel.$propKey(this.relatedProp);
      let arr = relatedByOwnerId[key];

      if (!arr) {
        arr = [];
        relatedByOwnerId[key] = arr;
      }

      arr.push(rel);
    }

    for (let i = 0, l = owners.length; i < l; ++i) {
      const own = owners[i];
      const key = own.$propKey(this.ownerProp);

      own[this.name] = relatedByOwnerId[key] || [];
    }
  }

  appendRelationProp(owner, related) {
    owner[this.name] = this.mergeModels(owner[this.name], related);
  }

  insert(builder, owner) {
    return new HasManyInsertOperation('insert', {
      relation: this,
      owner: owner
    });
  }

  relate(builder, owner) {
    return new HasManyRelateOperation('relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(builder, owner) {
    return new HasManyUnrelateOperation('unrelate', {
      relation: this,
      owner: owner
    });
  }
}

