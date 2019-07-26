'use strict';

const { Relation } = require('../Relation');
const { BelongsToOneInsertOperation } = require('./BelongsToOneInsertOperation');
const { BelongsToOneDeleteOperation } = require('./BelongsToOneDeleteOperation');
const { BelongsToOneRelateOperation } = require('./BelongsToOneRelateOperation');
const { BelongsToOneUnrelateOperation } = require('./BelongsToOneUnrelateOperation');

class BelongsToOneRelation extends Relation {
  isOneToOne() {
    return true;
  }

  insert(_, owner) {
    return new BelongsToOneInsertOperation('insert', {
      relation: this,
      owner
    });
  }

  delete(_, owner) {
    return new BelongsToOneDeleteOperation('delete', {
      relation: this,
      owner
    });
  }

  relate(_, owner) {
    return new BelongsToOneRelateOperation('relate', {
      relation: this,
      owner
    });
  }

  unrelate(_, owner) {
    return new BelongsToOneUnrelateOperation('unrelate', {
      relation: this,
      owner
    });
  }
}

Object.defineProperties(BelongsToOneRelation.prototype, {
  isObjectionBelongsToOneRelation: {
    enumerable: false,
    writable: false,
    value: true
  }
});

module.exports = {
  BelongsToOneRelation
};
