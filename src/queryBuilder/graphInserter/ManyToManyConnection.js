export default class ManyToManyConnection {

  constructor(node, relation) {
    /**
     * @type {DependencyNode}
     */
    this.node = node;

    /**
     * @type {Relation}
     */
    this.relation = relation;

    relation.omitExtraProps([node.model]);
  }

}