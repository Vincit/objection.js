'use strict';

const { GraphAction } = require('../GraphAction');
const { groupBy } = require('../../../utils/objectUtils');
const promiseUtils = require('../../../utils/promiseUtils');

class GraphDeleteAction extends GraphAction {
  constructor(graphData, { nodes, areReferenced = true }) {
    super(graphData);
    // Nodes to delete.
    this.nodes = nodes;
    // Whether the parents still reference the nodes. Replaced rows of
    // BelongsToOneRelations are deleted after their owners were patched to
    // reference the new rows, so they can't be found through the relation.
    this.areReferenced = areReferenced;
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
        // Nodes of the same relation and parent can still require different
        // operations when they are marked with `#unrelate` or `#delete`.
        const nodesByShouldUnrelate = groupBy(nodes, (node) =>
          this.graphOptions.shouldUnrelate(node, this.graphData),
        );

        nodesByShouldUnrelate.forEach((nodes, shouldUnrelate) => {
          const builder = (
            this.areReferenced
              ? parentNode.obj.$relatedQuery(relation.name)
              : relation.relatedModelClass.query()
          ).childQueryOf(parentBuilder);

          if (!this.areReferenced || !relation.isObjectionBelongsToOneRelation) {
            // This is useless in case of a referenced BelongsToOneRelation.
            builder.findByIds(nodes.map((node) => node.obj.$id()));
          }

          for (const node of nodes) {
            node.userData.deleted = true;
          }

          builders.push(shouldUnrelate ? builder.unrelate() : builder.delete());
        });
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
