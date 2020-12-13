'use strict';

const { ModelGraphBuilder } = require('./ModelGraphBuilder');
const NOT_CALCULATED = {};

class ModelGraph {
  constructor(nodes, edges) {
    this.nodes = nodes;
    this.edges = edges;

    // These are calculated lazily.
    this._nodesByObjects = NOT_CALCULATED;
    this._nodesByIdPathKeys = NOT_CALCULATED;
  }

  static create(rootModelClass, roots) {
    const builder = ModelGraphBuilder.buildGraph(rootModelClass, roots);
    return new ModelGraph(builder.nodes, builder.edges);
  }

  static createEmpty() {
    return new ModelGraph([], []);
  }

  get rootObjects() {
    return this.nodes.filter((node) => !node.parentEdge).map((node) => node.obj);
  }

  nodeForObject(obj) {
    if (!obj) {
      return null;
    }

    if (this._nodesByObjects === NOT_CALCULATED) {
      this._nodesByObjects = createNodesByObjectsMap(this.nodes);
    }

    return this._nodesByObjects.get(obj) || null;
  }

  nodeForNode(node) {
    if (!node) {
      return null;
    }

    if (this._nodesByIdPathKeys === NOT_CALCULATED) {
      this._nodesByIdPathKeys = createNodesByIdPathKeysMap(this.nodes);
    }

    return this._nodesByIdPathKeys.get(node.idPathKey) || null;
  }
}

function createNodesByObjectsMap(nodes) {
  const nodesByObjects = new Map();

  for (const node of nodes) {
    nodesByObjects.set(node.obj, node);
  }

  return nodesByObjects;
}

function createNodesByIdPathKeysMap(nodes) {
  const nodesByIdPathKeys = new Map();

  for (const node of nodes) {
    const idPathKey = node.idPathKey;

    if (idPathKey !== null) {
      nodesByIdPathKeys.set(idPathKey, node);
    }
  }

  return nodesByIdPathKeys;
}

module.exports = {
  ModelGraph,
};
