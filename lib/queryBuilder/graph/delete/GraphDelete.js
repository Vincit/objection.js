'use strict';

const { GraphOperation } = require('../GraphOperation');
const { GraphDeleteAction } = require('./GraphDeleteAction');

class GraphDelete extends GraphOperation {
  // The owner of a replaced BelongsToOneRelation row references it until
  // `GraphPatch` points the owner to the new row, so these rows are deleted
  // afterwards by `GraphReplacedBelongsToOneDelete`. Removed rows, e.g. with
  // `pet: null`, are still deleted before the owner is patched.
  get deletesReplacedRows() {
    return false;
  }

  createActions() {
    return [
      new GraphDeleteAction(this.graphData, {
        nodes: this.currentGraph.nodes.filter(
          (currentNode) =>
            this.graphOptions.shouldDeleteOrUnrelate(currentNode, this.graphData) &&
            isReplacedBelongsToOneNode(currentNode, this.graph) === this.deletesReplacedRows,
        ),
        areReferenced: !this.deletesReplacedRows,
      }),
    ];
  }
}

class GraphReplacedBelongsToOneDelete extends GraphDelete {
  get deletesReplacedRows() {
    return true;
  }
}

function isReplacedBelongsToOneNode(currentNode, graph) {
  const { relation } = currentNode.parentEdge;

  if (!relation.isObjectionBelongsToOneRelation) {
    return false;
  }

  const parentNode = graph.nodeForNode(currentNode.parentNode);

  return (
    !!parentNode &&
    parentNode.edges.some(
      (edge) =>
        edge.relation === relation &&
        edge.isOwnerNode(parentNode) &&
        !edge.relatedNode.toBeUnrelatedOrDeleted,
    )
  );
}

module.exports = {
  GraphDelete,
  GraphReplacedBelongsToOneDelete,
};
