'use strict';

const { Relation } = require('../Relation');
const { HasManyInsertOperation } = require('./HasManyInsertOperation');
const { HasManyRelateOperation } = require('./HasManyRelateOperation');
const { HasManyUnrelateOperation } = require('./HasManyUnrelateOperation');

class HasManyRelation extends Relation {
  insert(_, owner) {
    return new HasManyInsertOperation('insert', {
      relation: this,
      owner: owner
    });
  }

  relate(_, owner) {
    return new HasManyRelateOperation('relate', {
      relation: this,
      owner: owner
    });
  }

  unrelate(_, owner) {
    return new HasManyUnrelateOperation('unrelate', {
      relation: this,
      owner: owner
    });
  }

  hasRelateProp(model) {
    return model.$hasId();
  }

  setRelateProp(model, values) {
    model.$id(values);
  }
}

Object.defineProperties(HasManyRelation.prototype, {
  isObjectionHasManyRelation: {
    enumerable: false,
    writable: false,
    value: true
  }
});

module.exports = {
  HasManyRelation
};
