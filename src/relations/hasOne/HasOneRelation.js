const HasManyRelation = require('../hasMany/HasManyRelation');

module.exports = class HasOneRelation extends HasManyRelation {

  isOneToOne() {
    return true;
  }
}