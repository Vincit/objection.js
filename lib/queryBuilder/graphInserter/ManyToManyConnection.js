class ManyToManyConnection {
  constructor(node, relation) {
    this.node = node;
    this.refNode = null;
    this.relation = relation;

    relation.omitExtraProps([node.model]);
  }
}

module.exports = ManyToManyConnection;
