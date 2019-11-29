'use strict';

const { ModelGraph } = require('../../model/graph/ModelGraph');
const { ModelGraphEdge } = require('../../model/graph/ModelGraphEdge');
const { createNotModelError } = require('../../model/graph/ModelGraphBuilder');
const { GraphFetcher } = require('../graph/GraphFetcher');
const { GraphInsert } = require('./insert/GraphInsert');
const { GraphPatch } = require('./patch/GraphPatch');
const { GraphDelete } = require('./delete/GraphDelete');
const { GraphRecursiveUpsert } = require('./recursiveUpsert/GraphRecursiveUpsert');
const { GraphOptions } = require('./GraphOptions');
const { ValidationErrorType } = require('../../model/ValidationError');
const { RelationExpression } = require('../RelationExpression');
const { GraphNodeDbExistence } = require('./GraphNodeDbExistence');
const { GraphData } = require('./GraphData');
const { uniqBy, asArray, isObject } = require('../../utils/objectUtils');

class GraphUpsert {
  constructor({ rootModelClass, objects, upsertOptions }) {
    checkCanBeConvertedToModels(rootModelClass, objects);

    this.objects = rootModelClass.ensureModelArray(objects, GraphUpsert.modelOptions);
    this.isArray = Array.isArray(objects);
    this.upsertOpt = upsertOptions;
  }

  static get modelOptions() {
    return { skipValidation: true };
  }

  run(builder) {
    const modelClass = builder.modelClass();
    const graphOptions = new GraphOptions(this.upsertOpt);

    const graph = ModelGraph.create(modelClass, this.objects);
    assignDbRefsAsRelateProps(graph);

    return createGraphData(builder, graphOptions, graph)
      .then(checkForErrors(builder))
      .then(pruneGraphs())
      .then(executeOperations(builder))
      .then(returnResult(this.objects, this.isArray));
  }
}

function checkCanBeConvertedToModels(modelClass, objects) {
  asArray(objects).forEach(obj => {
    if (!isObject(obj)) {
      throw createNotModelError(modelClass, obj);
    }
  });
}

function assignDbRefsAsRelateProps(graph) {
  for (const node of graph.nodes) {
    if (!node.parentEdge || !node.parentEdge.relation || !node.isDbReference) {
      continue;
    }

    node.parentEdge.relation.setRelateProp(node.obj, asArray(node.dbReference));
  }
}

async function createGraphData(builder, graphOptions, graph) {
  const currentGraph = await fetchCurrentGraph(builder, graphOptions, graph);

  const nodeDbExistence = await GraphNodeDbExistence.create({
    builder,
    graph,
    graphOptions,
    currentGraph
  });

  return new GraphData({ graph, currentGraph, graphOptions, nodeDbExistence });
}

function fetchCurrentGraph(builder, graphOptions, graph) {
  if (graphOptions.isInsertOnly()) {
    return Promise.resolve(ModelGraph.createEmpty());
  } else {
    return GraphFetcher.fetchCurrentGraph({ builder, graph, graphOptions });
  }
}

// Remove branches from the graph that require no operations. For example
// we never want to do anything for descendant nodes of a node that is
// deleted or unrelated. We never delete recursively.
function pruneGraphs() {
  return graphData => {
    pruneRelatedBranches(graphData);

    if (!graphData.graphOptions.isInsertOnly()) {
      pruneDeletedBranches(graphData);
    }

    return graphData;
  };
}

function pruneRelatedBranches(graphData) {
  const relateNodes = graphData.graph.nodes.filter(node => {
    return (
      !graphData.currentGraph.nodeForNode(node) &&
      !graphData.graphOptions.shouldInsertIgnoreDisable(node, graphData)
    );
  });

  removeBranchesFromGraph(findRoots(relateNodes), graphData.graph);
}

function pruneDeletedBranches(graphData) {
  const { graph, currentGraph } = graphData;

  const deleteNodes = currentGraph.nodes.filter(currentNode => !graph.nodeForNode(currentNode));
  const roots = findRoots(deleteNodes);

  // Don't delete relations the current graph doesn't even mention.
  // So if the parent node doesn't even have the relation, it's not
  // supposed to be deleted.
  const rootsNotInRelation = roots.filter(deleteRoot => {
    if (!deleteRoot.parentNode) {
      return false;
    }

    const { relation } = deleteRoot.parentEdge;
    const parentNode = graph.nodeForNode(deleteRoot.parentNode);

    if (!parentNode) {
      return false;
    }

    return parentNode.obj[relation.name] === undefined;
  });

  removeBranchesFromGraph(roots, currentGraph);
  removeNodesFromGraph(new Set(rootsNotInRelation), currentGraph);
}

function findRoots(nodes) {
  const nodeSet = new Set(nodes);

  return uniqBy(
    nodes.filter(node => {
      let parentNode = node.parentNode;

      while (parentNode) {
        if (nodeSet.has(parentNode)) {
          return false;
        }

        parentNode = parentNode.parentNode;
      }

      return true;
    })
  );
}

function removeBranchesFromGraph(branchRoots, graph) {
  const nodesToRemove = new Set(
    branchRoots.reduce(
      (nodesToRemove, node) => [...nodesToRemove, ...node.descendantRelationNodes],
      []
    )
  );

  removeNodesFromGraph(nodesToRemove, graph);
}

function removeNodesFromGraph(nodesToRemove, graph) {
  const edgesToRemove = new Set();

  for (const node of nodesToRemove) {
    for (const edge of node.edges) {
      const otherNode = edge.getOtherNode(node);

      if (!nodesToRemove.has(otherNode)) {
        otherNode.removeEdge(edge);
        edgesToRemove.add(edge);
      }
    }
  }

  graph.nodes = graph.nodes.filter(node => !nodesToRemove.has(node));
  graph.edges = graph.edges.filter(edge => !edgesToRemove.has(edge));

  return graph;
}

function checkForErrors(builder) {
  return graphData => {
    checkForNotFoundErrors(graphData, builder);
    checkForUnallowedRelationErrors(graphData, builder);
    checkForUnallowedReferenceErrors(graphData, builder);

    if (graphData.graphOptions.isInsertOnly()) {
      checkForHasManyRelateErrors(graphData);
    }

    return graphData;
  };
}

function checkForNotFoundErrors(graphData, builder) {
  const { graphOptions, currentGraph, graph } = graphData;

  for (const node of graph.nodes) {
    if (
      node.obj.$hasId() &&
      !graphOptions.shouldInsertIgnoreDisable(node, graphData) &&
      !graphOptions.shouldRelateIgnoreDisable(node, graphData) &&
      !currentGraph.nodeForNode(node)
    ) {
      if (!node.parentNode) {
        throw node.modelClass.createNotFoundError(builder.context(), {
          message: `root model (id=${node.obj.$id()}) does not exist. If you want to insert it with an id, use the insertMissing option`,
          dataPath: node.dataPath
        });
      } else {
        throw node.modelClass.createNotFoundError(builder.context(), {
          message: `model (id=${node.obj.$id()}) is not a child of model (id=${node.parentNode.obj.$id()}). If you want to relate it, use the relate option. If you want to insert it with an id, use the insertMissing option`,
          dataPath: node.dataPath
        });
      }
    }
  }
}

function checkForUnallowedRelationErrors(graphData, builder) {
  const { graph } = graphData;
  const allowedExpression = builder.allowedGraphExpression();

  if (allowedExpression) {
    const rootsObjs = graph.nodes.filter(node => !node.parentEdge).map(node => node.obj);
    const expression = RelationExpression.fromModelGraph(rootsObjs);

    if (!allowedExpression.isSubExpression(expression)) {
      throw builder.modelClass().createValidationError({
        type: ValidationErrorType.UnallowedRelation,
        message: 'trying to upsert an unallowed relation'
      });
    }
  }
}

function checkForUnallowedReferenceErrors(graphData, builder) {
  const { graph, graphOptions } = graphData;

  if (graphOptions.allowRefs()) {
    return;
  }

  if (graph.edges.some(edge => edge.type === ModelGraphEdge.Type.Reference)) {
    throw builder.modelClass().createValidationError({
      type: ValidationErrorType.InvalidGraph,
      message:
        '#ref references are not allowed in a graph by default. see the allowRefs insert/upsert graph option'
    });
  }
}

function checkForHasManyRelateErrors(graphData) {
  const { graph, graphOptions } = graphData;

  for (const node of graph.nodes) {
    if (
      graphOptions.shouldRelate(node, graphData) &&
      node.parentEdge.relation.isObjectionHasManyRelation
    ) {
      throw new Error(
        'You cannot relate HasManyRelation or HasOneRelation using insertGraph, because those require update operations. Consider using upsertGraph instead.'
      );
    }
  }
}

function executeOperations(builder) {
  return graphData => {
    const operations = graphData.graphOptions.isInsertOnly()
      ? [GraphInsert]
      : [GraphDelete, GraphInsert, GraphPatch, GraphRecursiveUpsert];

    return operations.reduce((promise, Operation) => {
      const operation = new Operation(graphData);
      const actions = operation.createActions();

      return promise.then(() => executeActions(builder, actions));
    }, Promise.resolve());
  };
}

function executeActions(builder, actions) {
  return actions.reduce(
    (promise, action) => promise.then(() => action.run(builder)),
    Promise.resolve()
  );
}

function returnResult(objects, isArray) {
  return () => (isArray ? objects : objects[0]);
}

module.exports = {
  GraphUpsert
};
