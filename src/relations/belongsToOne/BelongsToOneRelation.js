import Relation from '../Relation';
import BelongsToOneInsertOperation from './BelongsToOneInsertOperation';
import BelongsToOneRelateOperation from './BelongsToOneRelateOperation';
import BelongsToOneUnrelateOperation from './BelongsToOneUnrelateOperation';

export default class BelongsToOneRelation extends Relation {

  isOneToOne() {
    return true;
  }

  insert(builder, owner) {
    return new BelongsToOneInsertOperation('insert', {
      relation: this,
      owner: owner
    });
  }

  relate(builder, owner) {
    return new BelongsToOneRelateOperation('relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(builder, owner) {
    return new BelongsToOneUnrelateOperation('unrelate', {
      relation: this,
      owner: owner
    });
  }
}