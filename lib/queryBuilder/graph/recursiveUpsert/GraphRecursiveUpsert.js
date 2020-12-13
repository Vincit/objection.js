'use strict';

const { GraphOperation } = require('../GraphOperation');
const { GraphRecursiveUpsertAction } = require('./GraphRecursiveUpsertAction');

class GraphRecursiveUpsert extends GraphOperation {
  createActions() {
    return [
      new GraphRecursiveUpsertAction(this.graphData, {
        nodes: this.graph.nodes.filter((node) => {
          const shouldRelate = this.graphOptions.shouldRelate(node, this.graphData);
          return shouldRelate && hasRelations(node.obj);
        }),
      }),
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
  GraphRecursiveUpsert,
};
