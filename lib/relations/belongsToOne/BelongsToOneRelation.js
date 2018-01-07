const Relation = require('../Relation');
const BelongsToOneInsertOperation = require('./BelongsToOneInsertOperation');
const BelongsToOneRelateOperation = require('./BelongsToOneRelateOperation');
const BelongsToOneUnrelateOperation = require('./BelongsToOneUnrelateOperation');

class BelongsToOneRelation extends Relation {
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

module.exports = BelongsToOneRelation;
