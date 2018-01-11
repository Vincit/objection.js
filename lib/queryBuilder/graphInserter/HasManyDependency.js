const Dependency = require('./Dependency');

class HasManyDependency extends Dependency {
  constructor(node, relation) {
    super(node);
    this.relation = relation;
  }

  resolve(model) {
    const { ownerProp, relatedProp } = this.relation;

    for (let i = 0, l = ownerProp.size; i < l; ++i) {
      relatedProp.setProp(this.node.model, i, ownerProp.getProp(model, i));
    }
  }
}

module.exports = HasManyDependency;
