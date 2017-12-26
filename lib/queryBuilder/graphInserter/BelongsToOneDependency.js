const Dependency = require('./Dependency');

class BelongsToOneDependency extends Dependency {
  constructor(node, relation) {
    super(node);
    this.relation = relation;
  }

  resolve(model) {
    const { ownerProp, relatedProp } = this.relation;

    for (let i = 0, l = ownerProp.size; i < l; ++i) {
      ownerProp.setProp(this.node.model, i, relatedProp.getProp(model, i));
    }
  }
}

module.exports = BelongsToOneDependency;
