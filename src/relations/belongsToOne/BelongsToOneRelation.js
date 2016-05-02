import _ from 'lodash';
import Relation from '../Relation';

import BelongsToOneInsertOperation from './BelongsToOneInsertOperation';
import BelongsToOneRelateOperation from './BelongsToOneRelateOperation';
import BelongsToOneUnrelateOperation from './BelongsToOneUnrelateOperation';

export default class BelongsToOneRelation extends Relation {

  createRelationProp(owners, related) {
    let relatedByOwnerId = _.keyBy(related, related => related.$values(this.relatedProp));

    _.each(owners, owner => {
      let ownerId = owner.$values(this.ownerProp);
      owner[this.name] = relatedByOwnerId[ownerId] || null;
    });
  }

  insert(builder, owner) {
    return new BelongsToOneInsertOperation(builder, 'insert', {
      relation: this,
      owner: owner
    });
  }

  relate(builder, owner) {
    return new BelongsToOneRelateOperation(builder, 'relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(builder, owner) {
    return new BelongsToOneUnrelateOperation(builder, 'unrelate', {
      relation: this,
      owner: owner
    });
  }
}