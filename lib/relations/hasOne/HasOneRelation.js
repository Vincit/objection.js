const HasManyRelation = require('../hasMany/HasManyRelation');

class HasOneRelation extends HasManyRelation {
  isOneToOne() {
    return true;
  }
}

module.exports = HasOneRelation;
