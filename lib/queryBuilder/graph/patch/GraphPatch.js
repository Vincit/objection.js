'use strict';

const { GraphOperation } = require('../GraphOperation');
const { GraphPatchAction } = require('./GraphPatchAction');

class GraphPatch extends GraphOperation {
  createActions() {
    return [
      new GraphPatchAction({
        nodes: this.graph.nodes.filter(node =>
          this.graphOptions.shouldPatchOrUpdateIgnoreDisable(node, this.currentGraph)
        ),

        graph: this.graph,
        currentGraph: this.currentGraph,
        graphOptions: this.graphOptions
      })
    ];
  }
}

module.exports = {
  GraphPatch
};
