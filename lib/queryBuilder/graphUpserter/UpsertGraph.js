'use strict';

const keyBy = require('lodash/keyBy');
const difference = require('lodash/difference');
const RelationExpression = require('../RelationExpression');
const UpsertNode = require('./UpsertNode');
const isSqlite = require('../../utils/knexUtils').isSqlite;

// Given an upsert model graph, creates a set of nodes that describe what to do
// to each individual model in the graph. node.type returns the needed action
// (one of insert, update, delete and relate). This class determines the needed
// actions by fetching the current state of the graph from the database. Only ids
// and foreign keys needed by the relations are fetched.
class UpsertGraph {

  constructor(upsert, queryProps, opt) {
    this.upsert = Array.isArray(upsert) ? upsert : [upsert];
    this.queryProps = queryProps;
    this.rootModelClass = getRootModelClass(upsert);
    this.relExpr = RelationExpression.fromGraph(upsert);
    this.nodes = [];
    this.nodesByUpsert = new Map();
    this.opt = opt || {};
  }

  build(builder) {
    return this
      .fetchCurrentState(builder)
      .then(currentState => this.buildGraph(currentState));
  }

  // Fetches the current state of the graph from the database. This method
  // only fetches ids and all foreign keys needed by the relations.
  fetchCurrentState(builder) {
    const rootIds = getRootIds(this.upsert);
    const rootIdCols = builder.fullIdColumnFor(this.rootModelClass);
    const allowedExpr = builder._allowedUpsertExpression;
    const oldContext = builder.context();

    if (allowedExpr && !allowedExpr.isSubExpression(this.relExpr)) {
      throw builder.modelClass().createValidationError({allowedRelations: 'trying to upsert an unallowed relation'});
    }

    if (rootIds.length === 0) {
      return Promise.resolve([]);
    }

    // Add a global onBuild hook that only selects the id property. Then we
    // set the `keepImplicitJoinProps` option to true, and voila: we have all
    // foreign keys + the id.
    const context = Object.assign({}, oldContext, {
      onBuild(qb) {
        // There may be an onBuild hook in the old context.
        if (oldContext.onBuild) {
          oldContext.onBuild(qb);
        }

        // If there are no explicit selects, select the id.
        if (!qb.has(/select/)) {
          qb.select(qb.fullIdColumnFor(qb.modelClass()));
        }
      }
    });

    return builder
      .modelClass()
      .query()
      .childQueryOf(builder, true)
      .whereInComposite(rootIdCols, rootIds)
      .eager(this.relExpr)
      .internalOptions({
        keepImplicitJoinProps: true
      })
      // Don't use mergeContext here so that the added stuff doesn't leak
      // to other queries.
      .context(context);
  }

  buildGraph(current) {
    this.doBuildGraph(this.rootModelClass, this.upsert, current, null, this.relExpr);
  }

  doBuildGraph(modelClass, upsert, current, parentNode, relExpr) {
    this.buildGraphArray(modelClass, ensureArray(upsert), ensureArray(current), parentNode, relExpr);
  }

  buildGraphArray(modelClass, upsert, current, parentNode, relExpr) {
    const idProp = modelClass.getIdPropertyArray();

    const upsertById = keyBy(upsert, model => model.$propKey(idProp));
    const currentById = keyBy(current, model => model.$propKey(idProp));

    upsert.forEach(upsert => {
      const key = upsert.$propKey(idProp);
      const current = currentById[key];

      this.buildGraphSingle(modelClass, upsert, current, parentNode, relExpr);
    });

    current.forEach(current => {
      const key = current.$propKey(idProp);
      const upsert = upsertById[key];

      if (!upsert) {
        this.buildGraphSingle(modelClass, upsert, current, parentNode, relExpr);
      }
    });
  }

  buildGraphSingle(modelClass, upsert, current, parentNode, relExpr) {
    if (!upsert && !current) {
      return;
    }

    const node = new UpsertNode(parentNode, relExpr, upsert, current, this.queryProps, this.opt);
    this.nodes.push(node);

    if (upsert) {
      this.nodesByUpsert.set(upsert, node);
    }

    if (parentNode) {
      parentNode.relations[relExpr.name] = parentNode.relations[relExpr.name] || [];
      parentNode.relations[relExpr.name].push(node);
    }

    // No need to build the graph down from a deleted node.
    if (node.upsertModel === null) {
      return;
    }

    relExpr.forEachChildExpression(modelClass.getRelations(), (expr, relation) => {
      const relUpsert = upsert && upsert[relation.name];
      const relCurrent = current && current[relation.name];

      this.doBuildGraph(relation.relatedModelClass, relUpsert, relCurrent, node, expr);
    });
  }
}

function getRootModelClass(graph) {
  if (Array.isArray(graph)) {
    return graph[0].constructor;
  } else {
    return graph.constructor;
  }
}

function getRootIds(graph) {
  if (!Array.isArray(graph)) {
    graph = [graph];
  }

  return graph
    .filter(it => it.$hasId())
    .map(root => root.$id());
}

function ensureArray(item) {
  if (item && !Array.isArray(item)) {
    return [item];
  } else if (!item) {
    return [];
  } else {
    return item;
  }
}

module.exports = UpsertGraph;