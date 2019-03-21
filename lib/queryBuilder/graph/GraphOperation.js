'use strict';

const { asArray, groupBy } = require('../../utils/objectUtils');
const { isInternalProp } = require('../../utils/internalPropUtils');
const { ModelGraph } = require('../../model/graph/ModelGraph');
const { FetchStrategy } = require('./GraphOptions');
const { RelationExpression } = require('../RelationExpression');

class GraphOperation {
  constructor({ graph, currentGraph, graphOptions }) {
    this.graph = graph;
    this.currentGraph = currentGraph;
    this.graphOptions = graphOptions;
  }

  static fetchCurrentGraph({ builder, graph, graphOptions }) {
    const rootObjects = graph.rootObjects;
    const rootIds = getRootIds(rootObjects);
    const modelClass = builder.modelClass();

    if (rootIds.length === 0) {
      return Promise.resolve(ModelGraph.create(modelClass, []));
    }

    const eagerExpr = RelationExpression.fromModelGraph(rootObjects);

    return modelClass
      .query()
      .childQueryOf(builder, childQueryOptions())
      .modify(propagateMethodCallsFromQuery(builder))
      .modify(buildFetchQuerySelects(graph, graphOptions, eagerExpr))
      .findByIds(rootIds)
      .eagerAlgorithm(modelClass.WhereInEagerAlgorighm)
      .eager(eagerExpr)
      .internalOptions(fetchQueryInternalOptions())
      .then(models => ModelGraph.create(modelClass, models));
  }

  createActions() {
    return [];
  }

  shouldRelateAncestor(node) {
    if (!node.parentNode) {
      return false;
    }

    return (
      this.graphOptions.shouldRelate(node.parentNode, this.currentGraph) ||
      this.shouldRelateAncestor(node.parentNode)
    );
  }
}

function getRootIds(graph) {
  return asArray(graph)
    .filter(it => it.$hasId())
    .map(root => root.$id());
}

function propagateMethodCallsFromQuery(builder) {
  return fetchBuilder => {
    // Propagate some method calls from the root query.
    for (const method of ['forUpdate', 'forShare']) {
      if (builder.has(method)) {
        fetchBuilder[method]();
      }
    }
  };
}

function buildFetchQuerySelects(graph, graphOptions, eagerExpr) {
  return builder => {
    const nodesByRelationPath = groupBy(graph.nodes, node => node.relationPathKey);

    forEachPath(eagerExpr.node, relationPath => {
      if (!nodesByRelationPath.has(relationPath)) {
        nodesByRelationPath.set(relationPath, []);
      }
    });

    for (const [relationPath, nodes] of nodesByRelationPath.entries()) {
      let select = () => {};

      if (graphOptions.isFetchStrategy(FetchStrategy.OnlyIdentifiers)) {
        select = builder => {
          builder.select(builder.fullIdColumn());
        };
      } else if (graphOptions.isFetchStrategy(FetchStrategy.OnlyNeeded)) {
        select = builder => {
          const selects = new Map();

          for (const node of nodes) {
            const relationNames = node.modelClass.getRelationNames();

            for (const prop of Object.keys(node.obj)) {
              if (
                relationNames.includes(prop) ||
                selects.has(prop) ||
                prop === node.modelClass.dbRefProp ||
                prop === node.modelClass.uidRefProp ||
                prop === node.modelClass.uidProp ||
                isInternalProp(prop)
              ) {
                continue;
              }

              let columnRef = null;

              if (node.parentEdge && node.parentEdge.relation.isObjectionManyToManyRelation) {
                const relation = node.parentEdge.relation;
                const extra = relation.joinTableExtras.find(extra => extra.aliasProp === prop);

                if (extra) {
                  columnRef = `${builder.tableRefFor(relation.joinModelClass)}.${
                    extra.joinTableCol
                  } as ${extra.aliasCol}`;
                }
              }

              if (!columnRef) {
                columnRef = `${builder.tableRefFor(
                  node.modelClass
                )}.${node.modelClass.propertyNameToColumnName(prop)}`;
              }

              selects.set(prop, columnRef);
            }
          }

          const selectArr = Array.from(selects.values());

          if (selectArr.length === 0) {
            selectArr.push(builder.fullIdColumn());
          }

          builder.select(selectArr);
        };
      }

      if (!relationPath) {
        builder.modify(select);
      } else {
        builder.modifyEager(relationPath, select);
      }
    }
  };
}

function childQueryOptions() {
  return {
    fork: true,
    isInternalQuery: true
  };
}

function fetchQueryInternalOptions() {
  return {
    keepImplicitJoinProps: true
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
  GraphOperation
};
