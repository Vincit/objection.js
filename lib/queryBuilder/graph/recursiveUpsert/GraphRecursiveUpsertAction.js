'use strict';

const { GraphAction } = require('../GraphAction');
const { groupBy } = require('../../../utils/objectUtils');
const promiseUtils = require('../../../utils/promiseUtils');

class GraphRecursiveUpsertAction extends GraphAction {
  constructor({ nodes, graph, graphOptions }) {
    super();

    // Nodes to upsert.
    this.nodes = nodes;
    this.graph = graph;
    this.graphOptions = graphOptions;
  }

  run(builder) {
    const builders = this._createUpsertBuilders(builder, this.nodes);

    return promiseUtils.map(builders, builder => builder.execute(), {
      concurrency: this._getConcurrency(builder, this.nodes)
    });
  }

  _createUpsertBuilders(parentBuilder, nodesToUpsert) {
    const nodesByRelation = groupBy(nodesToUpsert, getRelation);
    const builders = [];

    nodesByRelation.forEach(nodes => {
      const nodesByParent = groupBy(nodes, getParent);

      nodesByParent.forEach(nodes => {
        for (const node of nodes) {
          node.userData.upserted = true;
        }

        builders.push(
          nodes[0].modelClass
            .query()
            .childQueryOf(parentBuilder)
            .copyFrom(parentBuilder, GraphAction.ReturningAllSelector)
            .upsertGraph(nodes.map(node => node.obj), this.graphOptions.rebasedOptions(nodes[0]))
        );
      });
    });

    return builders;
  }
}

function getRelation(node) {
  return node.parentEdge.relation;
}

function getParent(node) {
  return node.parentNode;
}

module.exports = {
  GraphRecursiveUpsertAction
};
