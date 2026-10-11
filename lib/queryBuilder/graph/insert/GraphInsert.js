'use strict';

const { JoinRowGraphInsertAction } = require('./JoinRowGraphInsertAction');
const { DeferredRelationGraphInsertAction } = require('./DeferredRelationGraphInsertAction');
const { GraphInsertAction } = require('./GraphInsertAction');
const { GraphOperation } = require('../GraphOperation');
const { ModelGraphEdge } = require('../../../model/graph/ModelGraphEdge');

class GraphInsert extends GraphOperation {
  constructor(...args) {
    super(...args);
    this.dependencies = this._createDependencyMap();
    this.deferredEdges = new Set();
  }

  createActions() {
    return [
      ...this._createNormalActions(),
      ...this._createDeferredRelationActions(),
      ...this._createJoinRowActions(),
    ];
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
    if (edge.relatedNode.toBeUnrelatedOrDeleted) {
      // Models marked with `#unrelate` or `#delete` are never inserted or
      // related, so their keys must not be copied to the owner (or vice versa).
      return;
    }

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
      const nodesToInsert = this.graph.nodes.filter((node) => {
        return !this._isHandled(node, handledNodes) && !this._hasDependencies(node, handledNodes);
      });

      if (nodesToInsert.length === 0) {
        if (handledNodes.size !== this.graph.nodes.length && this._breakCycle(handledNodes)) {
          continue;
        }

        break;
      }

      actions.push(
        new GraphInsertAction(this.graphData, {
          nodes: nodesToInsert,
          dependencies: this.dependencies,
          deferredEdges: this.deferredEdges,
        }),
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

  // Tries to break a dependency cycle by deferring one `BelongsToOneRelation`
  // edge that points to a `#ref` node. The owner node is then inserted without
  // the foreign key, which is patched in by `DeferredRelationGraphInsertAction`
  // once the referenced node has been inserted. Cycles can only exist through
  // `#ref` nodes, since the graph is a tree otherwise.
  _breakCycle(handledNodes) {
    for (const node of this.graph.nodes) {
      if (this._isHandled(node, handledNodes)) {
        continue;
      }

      for (const edge of this._pendingDependencyEdges(node, handledNodes)) {
        if (
          this._canDeferEdge(edge, node) &&
          this._isBlockedBy(edge.relatedNode, node, handledNodes, new Set())
        ) {
          this.deferredEdges.add(edge);
          return true;
        }
      }
    }

    return false;
  }

  _canDeferEdge(edge, node) {
    return (
      edge.type === ModelGraphEdge.Type.Relation &&
      edge.relation.isObjectionBelongsToOneRelation &&
      edge.isOwnerNode(node) &&
      edge.relatedNode.isReference &&
      // The owner is patched by its id, which models without one don't have (#2305).
      node.modelClass.getIdColumnArray().length > 0 &&
      // Both ends need to be inserted for the foreign key to be patched in later.
      this.graphOptions.shouldInsert(node, this.graphData) &&
      this.graphOptions.shouldInsert(edge.relatedNode.referencedNode, this.graphData) &&
      !this._isReadByPropertyReference(node, edge.relation.ownerProp)
    );
  }

  // Returns true if a `#ref{}` property reference reads one of the `props` of
  // `node`. Such references may be resolved before a deferred prop is set,
  // which would resolve them to `undefined`.
  _isReadByPropertyReference(node, props) {
    return node.refEdges.some((edge) => {
      return (
        edge.refType === ModelGraphEdge.ReferenceType.Property &&
        edge.isRelatedNode(node) &&
        props.props.includes(edge.refRelatedDataPath[0])
      );
    });
  }

  // Returns true if `node` (transitively) waits for `blockingNode` to be handled.
  _isBlockedBy(node, blockingNode, handledNodes, visitedNodes) {
    if (node === blockingNode) {
      return true;
    }

    if (visitedNodes.has(node)) {
      return false;
    }

    visitedNodes.add(node);

    for (const edge of this._pendingDependencyEdges(node, handledNodes)) {
      if (this._isBlockedBy(edge.getOtherNode(node), blockingNode, handledNodes, visitedNodes)) {
        return true;
      }
    }

    return false;
  }

  _createDeferredRelationActions() {
    if (this.deferredEdges.size === 0) {
      return [];
    }

    return [
      new DeferredRelationGraphInsertAction(this.graphData, {
        edges: [...this.deferredEdges],
      }),
    ];
  }

  _isHandled(node, handledNodes) {
    return handledNodes.has(node);
  }

  _hasDependencies(node, handledNodes) {
    return this._pendingDependencyEdges(node, handledNodes).length > 0;
  }

  // Returns the dependency edges of `node` whose other node still needs to be
  // inserted first. Deferred edges are ignored.
  _pendingDependencyEdges(node, handledNodes) {
    const edges = this.dependencies.get(node) || [];

    return edges.filter((edge) => {
      const dependencyNode = edge.getOtherNode(node);

      return (
        !this.deferredEdges.has(edge) &&
        !handledNodes.has(dependencyNode) &&
        !this.currentGraph.nodeForNode(dependencyNode)
      );
    });
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
        nodes: this.graph.nodes.filter((node) => {
          return (
            this.currentGraph.nodeForNode(node) === null &&
            node.parentEdge &&
            node.parentEdge.relation.isObjectionManyToManyRelation
          );
        }),
      }),
    ];
  }
}

module.exports = {
  GraphInsert,
};
