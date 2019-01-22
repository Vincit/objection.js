'use strict';

const { GraphOperation } = require('../GraphOperation');
const { GraphRecursiveUpsertAction } = require('./GraphRecursiveUpsertAction');

class GraphRecursiveUpsert extends GraphOperation {
  createActions() {
    return [
      new GraphRecursiveUpsertAction({
        nodes: this.graph.nodes.filter(node => {
          const shouldRelate = this.graphOptions.shouldRelate(node, this.currentGraph);
          return shouldRelate && hasRelations(node.obj);
        }),

        currentGraph: this.currentGraph,
        graphOptions: this.graphOptions
      })
    ];
  }
}

function hasRelations(obj) {
  for (const relationName of obj.constructor.getRelationNames()) {
    if (obj.hasOwnProperty(relationName)) {
      return true;
    }
  }

  return false;
}

module.exports = {
  GraphRecursiveUpsert
};
