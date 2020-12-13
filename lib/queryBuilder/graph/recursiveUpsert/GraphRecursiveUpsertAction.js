'use strict';

const { GraphAction } = require('../GraphAction');
const { groupBy, get, set } = require('../../../utils/objectUtils');
const { forEachPropertyReference } = require('../../../model/graph/ModelGraphBuilder');
const promiseUtils = require('../../../utils/promiseUtils');

class GraphRecursiveUpsertAction extends GraphAction {
  constructor(graphData, { nodes }) {
    super(graphData);
    // Nodes to upsert.
    this.nodes = nodes;
  }

  run(builder) {
    const builders = this._createUpsertBuilders(builder, this.nodes);

    return promiseUtils.map(builders, (builder) => builder.execute(), {
      concurrency: this._getConcurrency(builder, this.nodes),
    });
  }

  _createUpsertBuilders(parentBuilder, nodesToUpsert) {
    const nodesByRelation = groupBy(nodesToUpsert, getRelation);
    const builders = [];

    nodesByRelation.forEach((nodes) => {
      const nodesByParent = groupBy(nodes, getParent);

      nodesByParent.forEach((nodes) => {
        for (const node of nodes) {
          this._resolveReferences(node);
          node.userData.upserted = true;
        }

        builders.push(
          nodes[0].modelClass
            .query()
            .childQueryOf(parentBuilder)
            .copyFrom(parentBuilder, GraphAction.ReturningAllSelector)
            .upsertGraph(
              nodes.map((node) => node.obj),
              this.graphOptions.rebasedOptions(nodes[0])
            )
        );
      });
    });

    return builders;
  }

  /**
   * The nodes inside the subgraph we are about to recursively upsert may
   * have references outside that graph that won't be available during the
   * recursive upsertGraph call. This method resolves the references.
   *
   * TODO: This doesn't work if a recursively upserted node refers to
   *       a node inside another recursively upsertable graph.
   */
  _resolveReferences(node) {
    node.obj.$traverse((obj) => this._resolveReferencesForObject(obj));
  }

  _resolveReferencesForObject(obj) {
    this._resolveObjectReference(obj);
    this._resolvePropertyReferences(obj);
  }

  _resolveObjectReference(obj) {
    const modelClass = obj.constructor;
    const ref = obj[modelClass.uidRefProp];

    if (!ref) {
      return;
    }

    const referencedNode = this.graph.nodes.find((it) => it.uid === ref);

    if (!referencedNode) {
      return;
    }

    const relationNames = referencedNode.modelClass.getRelationNames();

    for (const prop of Object.keys(referencedNode.obj)) {
      if (relationNames.includes(prop)) {
        continue;
      }

      obj[prop] = referencedNode.obj[prop];
    }

    delete obj[modelClass.uidRefProp];
  }

  _resolvePropertyReferences(obj) {
    forEachPropertyReference(obj, ({ path, refMatch, ref, refPath }) => {
      const referencedNode = this.graph.nodes.find((it) => it.uid === ref);

      if (!referencedNode) {
        return;
      }

      const referencedValue = get(referencedNode.obj, refPath);
      const value = get(obj, path);

      if (value === refMatch) {
        set(obj, path, referencedValue);
      } else {
        set(obj, path, value.replace(refMatch, referencedValue));
      }
    });
  }
}

function getRelation(node) {
  return node.parentEdge.relation;
}

function getParent(node) {
  return node.parentNode;
}

module.exports = {
  GraphRecursiveUpsertAction,
};
