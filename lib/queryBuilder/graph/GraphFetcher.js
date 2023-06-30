'use strict';

const { asArray, groupBy } = require('../../utils/objectUtils');
const { ModelGraph } = require('../../model/graph/ModelGraph');
const { FetchStrategy } = require('./GraphOptions');
const { RelationExpression } = require('../RelationExpression');

class GraphFetcher {
  /**
   * Given a graph and options, fetches the current state of that graph
   * from the database and returns it as a ModelGraph instance.
   */
  static async fetchCurrentGraph({ builder, graph, graphOptions }) {
    const { rootObjects } = graph;

    const rootIds = getRootIds(rootObjects);
    const modelClass = builder.modelClass();

    if (rootIds.length === 0) {
      return Promise.resolve(ModelGraph.create(modelClass, []));
    }

    const eagerExpr = RelationExpression.fromModelGraph(rootObjects);
    const models = await modelClass
      .query()
      .childQueryOf(builder, childQueryOptions())
      .modify(propagateMethodCallsFromQuery(builder))
      .modify(buildFetchQuerySelects(graph, graphOptions, eagerExpr))
      .findByIds(rootIds)
      .withGraphFetched(eagerExpr)
      .internalOptions(fetchQueryInternalOptions());

    return ModelGraph.create(modelClass, models);
  }
}

function getRootIds(rootObjects) {
  return asArray(rootObjects)
    .filter((it) => it.$hasId())
    .map((root) => root.$id());
}

function propagateMethodCallsFromQuery(builder) {
  return (fetchBuilder) => {
    // Propagate some method calls from the root query.
    for (const method of ['forUpdate', 'forShare', 'forNoKeyUpdate', 'forKeyShare']) {
      if (builder.has(method)) {
        fetchBuilder[method]();
      }
    }
  };
}

function buildFetchQuerySelects(graph, graphOptions, eagerExpr) {
  return (builder) => {
    const nodesByRelationPath = groupNodesByRelationPath(graph, eagerExpr);

    for (const [relationPath, nodes] of nodesByRelationPath.entries()) {
      const selectModifier = createFetchSelectModifier(nodes, graphOptions);

      if (!relationPath) {
        builder.modify(selectModifier);
      } else {
        builder.modifyGraph(relationPath, selectModifier);
      }
    }
  };
}

function groupNodesByRelationPath(graph, eagerExpr) {
  const nodesByRelationPath = groupBy(graph.nodes, (node) => node.relationPathKey);

  // Not all relation paths have nodes. Relations with nulls or empty arrays
  // don't have nodes, but will still need to be fetched. Add these to the
  // map as empty arrays.
  forEachPath(eagerExpr.node, (relationPath) => {
    if (!nodesByRelationPath.has(relationPath)) {
      nodesByRelationPath.set(relationPath, []);
    }
  });

  return nodesByRelationPath;
}

function createFetchSelectModifier(nodes, graphOptions) {
  if (graphOptions.isFetchStrategy(FetchStrategy.OnlyIdentifiers)) {
    return createIdentifierSelector();
  } else if (graphOptions.isFetchStrategy(FetchStrategy.OnlyNeeded)) {
    return createInputColumnSelector(nodes);
  } else {
    return () => {};
  }
}

// Returns a function that only selects the id column.
function createIdentifierSelector() {
  return (builder) => {
    builder.select(builder.fullIdColumn());
  };
}

// Returns a function that only selects the columns that exist in the input.
function createInputColumnSelector(nodes) {
  return (builder) => {
    const selects = new Map();

    for (const node of nodes) {
      const databaseJson = node.obj.$toDatabaseJson(builder);

      for (const column of Object.keys(databaseJson)) {
        if (!shouldSelectColumn(column, selects, node)) {
          continue;
        }

        const selection =
          createManyToManyExtraSelectionIfNeeded(builder, column, node) ||
          createSelection(builder, column, node);

        selects.set(column, selection);
      }
    }

    const selectArr = Array.from(selects.values());
    const idColumns = asArray(builder.fullIdColumn());

    for (const idColumn of idColumns) {
      if (!selectArr.includes(idColumn)) {
        // Always select the identifers.
        selectArr.push(idColumn);
      }
    }

    builder.select(selectArr);
  };
}

function shouldSelectColumn(column, selects, node) {
  const modelClass = node.modelClass;

  return (
    !selects.has(column) &&
    column !== modelClass.propertyNameToColumnName(modelClass.dbRefProp) &&
    column !== modelClass.propertyNameToColumnName(modelClass.uidRefProp) &&
    column !== modelClass.propertyNameToColumnName(modelClass.uidProp)
  );
}

function createManyToManyExtraSelectionIfNeeded(builder, column, node) {
  if (node.parentEdge && node.parentEdge.relation.isObjectionManyToManyRelation) {
    const relation = node.parentEdge.relation;
    const extra = relation.joinTableExtras.find((extra) => extra.aliasCol === column);

    if (extra) {
      return `${builder.tableRefFor(relation.joinModelClass)}.${extra.joinTableCol} as ${
        extra.aliasCol
      }`;
    }
  }

  return null;
}

function createSelection(builder, column, node) {
  return `${builder.tableRefFor(node.modelClass)}.${column}`;
}

function childQueryOptions() {
  return {
    fork: true,
    isInternalQuery: true,
  };
}

function fetchQueryInternalOptions() {
  return {
    keepImplicitJoinProps: true,
  };
}

function forEachPath(eagerExprNode, cb, path = []) {
  for (const relation of eagerExprNode.$childNames) {
    path.push(relation);
    cb(path.join('.'));
    forEachPath(eagerExprNode[relation], cb, path);
    path.pop();
  }
}

module.exports = {
  GraphFetcher,
};
