'use strict';

class GraphOperation {
  constructor(graphData) {
    this.graphData = graphData;
  }

  get graph() {
    return this.graphData.graph;
  }

  get currentGraph() {
    return this.graphData.currentGraph;
  }

  get graphOptions() {
    return this.graphData.graphOptions;
  }

  createActions() {
    return [];
  }
}

module.exports = {
  GraphOperation
};
