'use strict';

const { JoinRowGraphInsertAction } = require('./JoinRowGraphInsertAction');
const { GraphInsertAction } = require('./GraphInsertAction');
const { GraphOperation } = require('../GraphOperation');
const { ModelGraphEdge } = require('../../../model/graph/ModelGraphEdge');

class GraphInsert extends GraphOperation {
  constructor(...args) {
    super(...args);
    this.dependencies = this._createDependencyMap();
  }

  createActions() {
    return [...this._createNormalActions(), ...this._createJoinRowActions()];
  }

  _createDependencyMap() {
    const dependencies = new Map();

    for (const edge of this.graph.edges) {
      if (edge.type == ModelGraphEdge.Type.Relation) {
        this._createRelationDependency(edge, dependencies);
      } else {
        this._createReferenceDependency(edge, dependencies);
      }
    }

    return dependencies;
  }

  _createRelationDependency(edge, dependencies) {
    if (edge.relation.isObjectionHasManyRelation) {
      // In case of HasManyRelation the related node depends on the owner node
      // because the related node has the foreign key.
      this._addDependency(edge.relatedNode, edge, dependencies);
    } else if (edge.relation.isObjectionBelongsToOneRelation) {
      // In case of BelongsToOneRelation the owner node depends on the related
      // node because the owner node has the foreign key.
      this._addDependency(edge.ownerNode, edge, dependencies);
    }
  }

  _createReferenceDependency(edge, dependencies) {
    this._addDependency(edge.ownerNode, edge, dependencies);
  }

  _addDependency(node, edge, dependencies) {
    let edges = dependencies.get(node);

    if (!edges) {
      edges = [];
      dependencies.set(node, edges);
    }

    edges.push(edge);
  }

  _createNormalActions() {
    const handledNodes = new Set();
    const actions = [];

    while (true) {
      // At this point, don't care if the nodes have already been inserted before
      // given to this class. `GraphInsertAction` will test that and only insert
      // new ones. We need to pass all nodes to `GraphInsertActions` so that we
      // can resolve all dependencies.
      const nodesToInsert = this.graph.nodes.filter(node => {
        return !this._isHandled(node, handledNodes) && !this._hasDependencies(node, handledNodes);
      });

      if (nodesToInsert.length === 0) {
        break;
      }

      actions.push(
        new GraphInsertAction(this.graphData, {
          nodes: nodesToInsert,
          dependencies: this.dependencies
        })
      );

      for (const node of nodesToInsert) {
        this._markHandled(node, handledNodes);
      }
    }

    if (handledNodes.size !== this.graph.nodes.length) {
      throw new Error('the object graph contains cyclic references');
    }

    return actions;
  }

  _isHandled(node, handledNodes) {
    return handledNodes.has(node);
  }

  _hasDependencies(node, handledNodes) {
    if (!this.dependencies.has(node)) {
      return false;
    }

    for (const edge of this.dependencies.get(node)) {
      const dependencyNode = edge.getOtherNode(node);

      if (!handledNodes.has(dependencyNode) && !this.currentGraph.nodeForNode(dependencyNode)) {
        return true;
      }
    }

    return false;
  }

  _markHandled(node, handledNodes) {
    handledNodes.add(node);

    // The referencing nodes are all references that don't
    // represent any real entity. They are simply intermediate nodes
    // that depend on this node. Once this node is handled, we can
    // also mark those nodes as handled as there is nothing to actually
    // insert.
    for (const refNode of node.referencingNodes) {
      this._markHandled(refNode, handledNodes);
    }
  }

  _createJoinRowActions() {
    return [
      new JoinRowGraphInsertAction(this.graphData, {
        nodes: this.graph.nodes.filter(node => {
          return (
            this.currentGraph.nodeForNode(node) === null &&
            node.parentEdge &&
            node.parentEdge.relation.isObjectionManyToManyRelation
          );
        })
      })
    ];
  }
}

module.exports = {
  GraphInsert
};
