'use strict';

const { asArray } = require('../../utils/objectUtils');
const { ModelGraph } = require('../../model/graph/ModelGraph');
const { RelationExpression } = require('../RelationExpression');

class GraphOperation {
  constructor({ graph, currentGraph, graphOptions }) {
    this.graph = graph;
    this.currentGraph = currentGraph;
    this.graphOptions = graphOptions;
  }

  static fetchCurrentGraph({ builder, obj }) {
    const rootIds = getRootIds(obj);
    const modelClass = builder.modelClass();

    if (rootIds.length === 0) {
      return Promise.resolve(ModelGraph.create(modelClass, []));
    }

    return modelClass
      .query()
      .childQueryOf(builder, childQueryOptions())
      .modify(propagateMethodCallsFromQuery(builder))
      .findByIds(rootIds)
      .eager(RelationExpression.fromModelGraph(obj))
      .internalOptions(fetchQueryInternalOptions())
      .mergeContext(idSelectorContext(builder))
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

function idSelectorContext(builder) {
  const { onBuild } = builder.context();

  return {
    onBuild(builder) {
      // There may be an onBuild hook in the old context.
      if (onBuild) {
        onBuild.call(this, builder);
      }

      // We only select the id column(s). The relation columns (foreign keys etc.)
      // are automatically selected by objection. We keep them from being
      // deleted by enabling the `keepImplicitJoinProps` option.
      builder.select(builder.fullIdColumn());
    }
  };
}

module.exports = {
  GraphOperation
};
