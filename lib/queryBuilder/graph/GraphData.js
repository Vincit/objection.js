'use strict';

class GraphData {
  constructor({ graph, currentGraph, graphOptions, nodeDbExistence }) {
    this.graph = graph;
    this.currentGraph = currentGraph;
    this.graphOptions = graphOptions;
    this.nodeDbExistence = nodeDbExistence;
  }
}

module.exports = {
  GraphData
};
