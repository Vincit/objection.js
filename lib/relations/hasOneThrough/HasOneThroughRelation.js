const ManyToManyRelation = require('../manyToMany/ManyToManyRelation');

class HasOneThroughRelation extends ManyToManyRelation {
  isOneToOne() {
    return true;
  }
}

module.exports = HasOneThroughRelation;
