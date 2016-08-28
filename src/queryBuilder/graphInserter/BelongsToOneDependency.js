import Dependency from './Dependency';

export default class BelongsToOneDependency extends Dependency {

  constructor(node, relation) {
    super(node);

    /**
     * @type {Relation}
     */
    this.relation = relation;
  }

  resolve(model) {
    for (let i = 0; i < this.relation.relatedProp.length; ++i) {
      this.node.model[this.relation.ownerProp[i]] = model[this.relation.relatedProp[i]];
    }
  }
}