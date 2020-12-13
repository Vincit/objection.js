'use strict';

const { isPostgres } = require('../../utils/knexUtils');

const POSTGRES_MAX_INSERT_BATCH_SIZE = 100;
const MAX_CONCURRENCY = 100;

class GraphAction {
  constructor(graphData) {
    this.graphData = graphData;
  }

  static get ReturningAllSelector() {
    return (op) => {
      // Only select `returning('*')` operation.
      return op.name === 'returning' && op.args.includes('*');
    };
  }

  static getConcurrency(builder, nodes) {
    return nodes.reduce((minConcurrency, node) => {
      return Math.min(minConcurrency, node.modelClass.getConcurrency(builder.unsafeKnex()));
    }, MAX_CONCURRENCY);
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

  run(builder) {
    return null;
  }

  _getConcurrency(builder, nodes) {
    return GraphAction.getConcurrency(builder, nodes);
  }

  _getBatchSize(builder) {
    return isPostgres(builder.unsafeKnex()) ? POSTGRES_MAX_INSERT_BATCH_SIZE : 1;
  }

  _resolveReferences(node) {
    if (node.isReference) {
      this._resolveReference(node);
    }
  }

  _resolveReference(node) {
    const refNode = node.referencedNode;

    for (const prop of Object.keys(refNode.obj)) {
      if (!node.obj.hasOwnProperty(prop)) {
        node.obj[prop] = refNode.obj[prop];
      }
    }
  }
}

module.exports = {
  GraphAction,
};
