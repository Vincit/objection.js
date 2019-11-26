'use strict';

const { GraphOperation } = require('../GraphOperation');
const { GraphDeleteAction } = require('./GraphDeleteAction');

class GraphDelete extends GraphOperation {
  createActions() {
    return [
      new GraphDeleteAction(this.graphData, {
        nodes: this.currentGraph.nodes.filter(currentNode =>
          this.graphOptions.shouldDeleteOrUnrelate(currentNode, this.graphData)
        )
      })
    ];
  }
}

module.exports = {
  GraphDelete
};
