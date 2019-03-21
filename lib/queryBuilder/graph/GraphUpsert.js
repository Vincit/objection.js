'use strict';

const { ModelGraph } = require('../../model/graph/ModelGraph');
const { createNotModelError } = require('../../model/graph/ModelGraphBuilder');
const { GraphOperation } = require('../graph/GraphOperation');
const { GraphInsert } = require('../graph/insert/GraphInsert');
const { GraphPatch } = require('../graph/patch/GraphPatch');
const { GraphDelete } = require('../graph/delete/GraphDelete');
const { GraphRecursiveUpsert } = require('../graph/recursiveUpsert/GraphRecursiveUpsert');
const { GraphOptions } = require('../graph/GraphOptions');
const { ValidationErrorType } = require('../../model/ValidationError');
const { RelationExpression } = require('../RelationExpression');
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

    return fetchCurrentGraph(builder, graphOptions, graph)
      .then(pruneGraphs(graph, graphOptions))
      .then(checkForErrors(graph, graphOptions, builder))
      .then(executeOperations(graph, graphOptions, builder))
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

function fetchCurrentGraph(builder, graphOptions, graph) {
  if (graphOptions.isInsertOnly()) {
    return Promise.resolve(ModelGraph.createEmpty());
  } else {
    return GraphOperation.fetchCurrentGraph({ builder, graph, graphOptions });
  }
}

// Remove branches from the graph that require no operations. For example
// we never want to do anything for descendant nodes of a node that is
// deleted or unrelated. We never delete recursively.
function pruneGraphs(graph, graphOptions) {
  return currentGraph => {
    pruneRelatedBranches(graph, currentGraph, graphOptions);

    if (!graphOptions.isInsertOnly()) {
      pruneDeletedBranches(graph, currentGraph);
    }

    return currentGraph;
  };
}

function pruneRelatedBranches(graph, currentGraph, graphOptions) {
  const relateNodes = graph.nodes.filter(node => {
    return (
      !currentGraph.nodeForNode(node) && !graphOptions.shouldInsertIgnoreDisable(node, currentGraph)
    );
  });

  removeBranchesFromGraph(findRoots(relateNodes), graph);
}

function pruneDeletedBranches(graph, currentGraph) {
  const deleteNodes = currentGraph.nodes.filter(currentNode => !graph.nodeForNode(currentNode));

  removeBranchesFromGraph(findRoots(deleteNodes), currentGraph);
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

function checkForErrors(graph, graphOptions, builder) {
  return currentGraph => {
    checkForNotFoundErrors(graph, currentGraph, graphOptions, builder);
    checkForUnallowedRelationErrors(graph, builder);

    if (graphOptions.isInsertOnly()) {
      checkForHasManyRelateErrors(graph, currentGraph, graphOptions);
    }

    return currentGraph;
  };
}

function checkForNotFoundErrors(graph, currentGraph, graphOptions, builder) {
  for (const node of graph.nodes) {
    if (
      node.obj.$hasId() &&
      !graphOptions.shouldInsertIgnoreDisable(node, currentGraph) &&
      !graphOptions.shouldRelateIgnoreDisable(node, currentGraph) &&
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

function checkForUnallowedRelationErrors(graph, builder) {
  const allowedExpression = builder.allowedUpsertExpression();

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

function checkForHasManyRelateErrors(graph, currentGraph, graphOptions) {
  for (const node of graph.nodes) {
    if (
      graphOptions.shouldRelate(node, currentGraph) &&
      node.parentEdge.relation.isObjectionHasManyRelation
    ) {
      throw new Error(
        'You cannot relate HasManyRelation or HasOneRelation using insertGraph, because those require update operations. Consider using upsertGraph instead.'
      );
    }
  }
}

function executeOperations(graph, graphOptions, builder) {
  const operations = graphOptions.isInsertOnly()
    ? [GraphInsert]
    : [GraphDelete, GraphInsert, GraphPatch, GraphRecursiveUpsert];

  return currentGraph => {
    return operations.reduce((promise, Operation) => {
      const operation = new Operation({ graph, currentGraph, graphOptions });
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
