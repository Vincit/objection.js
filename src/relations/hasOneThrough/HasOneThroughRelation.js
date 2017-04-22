const ManyToManyRelation = require('../manyToMany/ManyToManyRelation');

module.exports = class HasOneThroughRelation extends ManyToManyRelation {

  isOneToOne() {
    return true;
  }
}