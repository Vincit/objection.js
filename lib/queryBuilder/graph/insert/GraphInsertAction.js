'use strict';

const { GraphAction } = require('../GraphAction');
const { groupBy, chunk, get, set } = require('../../../utils/objectUtils');
const { ModelGraphEdge } = require('../../../model/graph/ModelGraphEdge');
const promiseUtils = require('../../../utils/promiseUtils');

/**
 * Inserts a batch of nodes for a GraphInsert.
 *
 * One of these is created for each batch of nodes that can be inserted at once.
 * However, the nodes can have a different table and not all databases support
 * batch inserts, so this class splits the inserts into further sub batches
 * when needed.
 */
class GraphInsertAction extends GraphAction {
  constructor(graphData, { nodes, dependencies }) {
    super(graphData);

    // Nodes to insert.
    this.nodes = nodes;
    this.dependencies = dependencies;
  }

  run(builder) {
    const batches = this._createInsertBatches(builder);
    const concurrency = this._getConcurrency(builder, this.nodes);

    return promiseUtils.map(batches, batch => this._insertBatch(builder, batch), { concurrency });
  }

  _createInsertBatches(builder) {
    const batches = [];
    const batchSize = this._getBatchSize(builder);
    const nodesByModelClass = groupBy(this.nodes, getModelClass);

    for (const nodes of nodesByModelClass.values()) {
      for (const nodeBatch of chunk(nodes, batchSize)) {
        batches.push(nodeBatch);
      }
    }

    return batches;
  }

  async _insertBatch(parentBuilder, nodes) {
    await this._beforeInsert(nodes);
    await this._insert(parentBuilder, nodes);
    await this._afterInsert(nodes);
  }

  _beforeInsert(nodes) {
    this._resolveDependencies(nodes);
    this._omitManyToManyExtraProps(nodes);
    this._copyRelationPropsFromCurrentIfNeeded(nodes);

    return Promise.resolve();
  }

  _resolveDependencies(nodes) {
    for (const node of nodes) {
      const edges = this.dependencies.get(node);

      if (edges) {
        for (const edge of edges) {
          // `node` needs `dependencyNode` to have been inserted (and it has been).
          const dependencyNode = edge.getOtherNode(node);

          this._resolveDependency(dependencyNode, edge);
        }
      }
    }
  }

  _resolveDependency(dependencyNode, edge) {
    if (edge.type === ModelGraphEdge.Type.Relation && !edge.relation.joinTable) {
      this._resolveRelationDependency(dependencyNode, edge);
    } else if (edge.refType === ModelGraphEdge.ReferenceType.Property) {
      this._resolvePropertyReferenceNode(dependencyNode, edge);
    }
  }

  _resolveRelationDependency(dependencyNode, edge) {
    const dependentNode = edge.getOtherNode(dependencyNode);

    let sourceProp;
    let targetProp;

    if (edge.isOwnerNode(dependencyNode)) {
      sourceProp = edge.relation.ownerProp;
      targetProp = edge.relation.relatedProp;
    } else {
      targetProp = edge.relation.ownerProp;
      sourceProp = edge.relation.relatedProp;
    }

    this._resolveReferences(dependencyNode);

    for (let i = 0, l = targetProp.size; i < l; ++i) {
      targetProp.setProp(dependentNode.obj, i, sourceProp.getProp(dependencyNode.obj, i));
    }
  }

  _resolvePropertyReferenceNode(dependencyNode, edge) {
    const dependentNode = edge.getOtherNode(dependencyNode);

    let sourcePath;
    let targetPath;

    if (edge.isOwnerNode(dependencyNode)) {
      sourcePath = edge.refOwnerDataPath;
      targetPath = edge.refRelatedDataPath;
    } else {
      targetPath = edge.refOwnerDataPath;
      sourcePath = edge.refRelatedDataPath;
    }

    const sourceValue = get(dependencyNode.obj, sourcePath);
    const targetValue = get(dependentNode.obj, targetPath);

    if (targetValue === edge.refMatch) {
      set(dependentNode.obj, targetPath, sourceValue);
    } else {
      set(dependentNode.obj, targetPath, targetValue.replace(edge.refMatch, sourceValue));
    }
  }

  _omitManyToManyExtraProps(nodes) {
    for (const node of nodes) {
      if (
        node.parentEdge &&
        node.parentEdge.type === ModelGraphEdge.Type.Relation &&
        node.parentEdge.relation.joinTableExtras.length > 0
      ) {
        node.parentEdge.relation.omitExtraProps([node.obj]);
      }
    }
  }

  _copyRelationPropsFromCurrentIfNeeded(nodes) {
    for (const node of nodes) {
      const currentNode = this.currentGraph.nodeForNode(node);

      if (!currentNode) {
        continue;
      }

      for (const edge of node.edges) {
        if (edge.type !== ModelGraphEdge.Type.Relation) {
          continue;
        }

        const prop = edge.isOwnerNode(node) ? edge.relation.ownerProp : edge.relation.relatedProp;

        for (let i = 0, l = prop.size; i < l; ++i) {
          const value = prop.getProp(node.obj, i);

          if (value !== undefined) {
            continue;
          }

          prop.setProp(node.obj, i, prop.getProp(currentNode.obj, i));
        }
      }
    }
  }

  _insert(parentBuilder, nodes) {
    const [{ modelClass }] = nodes;

    nodes = nodes.filter(node => {
      return this.graphOptions.shouldInsert(node, this.graphData);
    });

    for (const node of nodes) {
      delete node.obj[modelClass.uidProp];
      node.obj.$validate(null, { dataPath: node.dataPathKey });
    }

    if (nodes.length === 0) {
      return;
    }

    for (const node of nodes) {
      node.userData.inserted = true;
    }

    return this._runRelationBeforeInsertMethods(parentBuilder, nodes).then(() => {
      return modelClass
        .query()
        .insert(nodes.map(node => node.obj))
        .childQueryOf(parentBuilder)
        .copyFrom(parentBuilder, GraphAction.ReturningAllSelector)
        .execute();
    });
  }

  _runRelationBeforeInsertMethods(parentBuilder, nodes) {
    return Promise.all(
      nodes.map(node => {
        if (node.parentEdge) {
          return node.parentEdge.relation.beforeInsert(node.obj, parentBuilder.context());
        } else {
          return null;
        }
      })
    );
  }

  _afterInsert(nodes) {
    for (const node of nodes) {
      for (const refNode of node.referencingNodes) {
        this._resolveDependency(refNode, refNode.parentEdge);
      }
    }
  }
}

function getModelClass(node) {
  return node.modelClass;
}

module.exports = {
  GraphInsertAction
};
