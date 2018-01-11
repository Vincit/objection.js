const Relation = require('../Relation');
const HasManyInsertOperation = require('./HasManyInsertOperation');
const HasManyRelateOperation = require('./HasManyRelateOperation');
const HasManyUnrelateOperation = require('./HasManyUnrelateOperation');

class HasManyRelation extends Relation {
  insert(builder, owner) {
    return new HasManyInsertOperation('insert', {
      relation: this,
      owner: owner
    });
  }

  relate(builder, owner) {
    return new HasManyRelateOperation('relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(builder, owner) {
    return new HasManyUnrelateOperation('unrelate', {
      relation: this,
      owner: owner
    });
  }

  hasRelateProp(model) {
    return model.$hasId();
  }
}

module.exports = HasManyRelation;
