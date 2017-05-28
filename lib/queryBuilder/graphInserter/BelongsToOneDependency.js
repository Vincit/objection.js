'use strict';

const Dependency = require('./Dependency');

class BelongsToOneDependency extends Dependency {

  constructor(node, relation) {
    super(node);
    this.relation = relation;
  }

  resolve(model) {
    for (let i = 0; i < this.relation.relatedProp.length; ++i) {
      this.node.model[this.relation.ownerProp[i]] = model[this.relation.relatedProp[i]];
    }
  }
}

module.exports = BelongsToOneDependency;