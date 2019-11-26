'use strict';

const { GraphOperation } = require('../GraphOperation');
const { GraphPatchAction } = require('./GraphPatchAction');

class GraphPatch extends GraphOperation {
  createActions() {
    return [
      new GraphPatchAction(this.graphData, {
        nodes: this.graph.nodes.filter(node =>
          this.graphOptions.shouldPatchOrUpdateIgnoreDisable(node, this.graphData)
        )
      })
    ];
  }
}

module.exports = {
  GraphPatch
};
