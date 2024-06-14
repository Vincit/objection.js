'use strict';

const { HasManyRelation } = require('../hasMany/HasManyRelation');

class HasOneRelation extends HasManyRelation {
  static isOneToOne() {
    return true;
  }
}

module.exports = {
  HasOneRelation,
};
