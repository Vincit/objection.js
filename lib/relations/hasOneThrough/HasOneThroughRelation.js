'use strict';

const { ManyToManyRelation } = require('../manyToMany/ManyToManyRelation');

class HasOneThroughRelation extends ManyToManyRelation {
  static isOneToOne() {
    return true;
  }
}

module.exports = {
  HasOneThroughRelation,
};
