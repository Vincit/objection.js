'use strict';

const { GraphAction } = require('../GraphAction');
const { groupBy } = require('../../../utils/objectUtils');
const promiseUtils = require('../../../utils/promiseUtils');

class GraphDeleteAction extends GraphAction {
  constructor(graphData, { nodes }) {
    super(graphData);
    // Nodes to delete.
    this.nodes = nodes;
  }

  run(builder) {
    const nodesTodelete = this._filterOutBelongsToOneRelationUnrelates(this.nodes);
    const builders = this._createDeleteBuilders(builder, nodesTodelete);

    return promiseUtils.map(builders, (builder) => builder.execute(), {
      concurrency: this._getConcurrency(builder, nodesTodelete),
    });
  }

  _filterOutBelongsToOneRelationUnrelates(nodes) {
    // `BelongsToOneRelation` unrelate is handled by `GraphPatch` because
    // unrelating a `BelongsToOneRelation` is just a matter of updating
    // one field of the parent node.
    return nodes.filter((node) => {
      return !(
        this.graphOptions.shouldUnrelate(node, this.graphData) &&
        node.parentEdge.relation.isObjectionBelongsToOneRelation
      );
    });
  }

  _createDeleteBuilders(parentBuilder, nodesTodelete) {
    const nodesByRelation = groupBy(nodesTodelete, getRelation);
    const builders = [];

    nodesByRelation.forEach((nodes, relation) => {
      const nodesByParent = groupBy(nodes, getParent);

      nodesByParent.forEach((nodes, parentNode) => {
        const shouldUnrelate = this.graphOptions.shouldUnrelate(nodes[0], this.graphData);

        const builder = parentNode.obj.$relatedQuery(relation.name).childQueryOf(parentBuilder);

        if (!relation.isObjectionBelongsToOneRelation) {
          // This is useless in case of BelongsToOneRelation.
          builder.findByIds(nodes.map((node) => node.obj.$id()));
        }

        for (const node of nodes) {
          node.userData.deleted = true;
        }

        builders.push(shouldUnrelate ? builder.unrelate() : builder.delete());
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
  GraphDeleteAction,
};
