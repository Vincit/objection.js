import _ from 'lodash';
import Relation from '../Relation';

import BelongsToOneInsertMethod from './BelongsToOneInsertMethod';
import BelongsToOneRelateMethod from './BelongsToOneRelateMethod';
import BelongsToOneUnrelateMethod from './BelongsToOneUnrelateMethod';

export default class BelongsToOneRelation extends Relation {

  createRelationProp(owners, related) {
    let relatedByOwnerId = _.keyBy(related, related => related.$values(this.relatedProp));

    _.each(owners, owner => {
      let ownerId = owner.$values(this.ownerProp);
      owner[this.name] = relatedByOwnerId[ownerId] || null;
    });
  }

  insert(builder, owner) {
    return new BelongsToOneInsertMethod(builder, 'insert', {
      relation: this,
      owner: owner
    });
  }

  relate(builder, owner) {
    return new BelongsToOneRelateMethod(builder, 'relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(builder, owner) {
    return new BelongsToOneUnrelateMethod(builder, 'unrelate', {
      relation: this,
      owner: owner
    });
  }
}