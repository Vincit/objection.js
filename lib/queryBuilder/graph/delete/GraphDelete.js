'use strict';

const { GraphOperation } = require('../GraphOperation');
const { GraphDeleteAction } = require('./GraphDeleteAction');

class GraphDelete extends GraphOperation {
  createActions() {
    return [
      new GraphDeleteAction(this.graphData, {
        nodes: this.currentGraph.nodes.filter(
          (currentNode) =>
            this.graphOptions.shouldDeleteOrUnrelate(currentNode, this.graphData) &&
            this.isDeletedByThisOperation(currentNode),
        ),
      }),
    ];
  }

  isDeletedByThisOperation(currentNode) {
    return !isBelongsToOneNode(currentNode);
  }
}

// The rows of BelongsToOneRelations are referenced by their owners, so they
// are deleted after `GraphPatch` has removed the references.
class GraphBelongsToOneDelete extends GraphDelete {
  isDeletedByThisOperation(currentNode) {
    return isBelongsToOneNode(currentNode);
  }
}

function isBelongsToOneNode(node) {
  return node.parentEdge.relation.isObjectionBelongsToOneRelation;
}

module.exports = {
  GraphDelete,
  GraphBelongsToOneDelete,
};
