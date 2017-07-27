'use strict';

const keyBy = require('lodash/keyBy');
const RelationExpression = require('../RelationExpression');
const UpsertNode = require('./UpsertNode');
const isSqlite = require('../../utils/knexUtils').isSqlite;

class UpsertGraph {

  constructor(upsert, opt) {
    this.upsert = Array.isArray(upsert) ? upsert : [upsert];
    this.rootModelClass = getRootModelClass(upsert);
    this.relExpr = RelationExpression.fromGraph(upsert);
    this.nodes = [];
    this.opt = opt || {};
  }

  build(builder) {
    return this
      .fetchCurrentState(builder)
      .then(currentState => this.buildGraph(currentState));
  }

  // Fetches the current state of the graph from the database. This method
  // only fetches ids and all foreign keys needed to insert the graph.
  fetchCurrentState(builder) {
    // Add a global onBuild hook that only selects the id property. Then we
    // set the `keepImplicitJoinProps` option to true, and voila: we have all
    // foreign keys + the id.
    return builder  
      .modelClass()
      .query()
      .childQueryOf(builder, true)
      .whereInComposite(builder.fullIdColumnFor(this.rootModelClass), getRootIds(this.upsert))
      .eager(this.relExpr)
      .internalOptions({
        keepImplicitJoinProps: true 
      })
      .context({
        onBuild(qb) {
          // If there are no explicit selects, select the id.
          if (!qb.has(/select/)) {
            qb.select(qb.fullIdColumnFor(qb.modelClass()));
          }
        }
      });
  }

  buildGraph(current) {
    this.buildGraphStep(this.rootModelClass, this.upsert, current, null, this.relExpr);
  }

  buildGraphStep(modelClass, upsert, current, parentNode, relExpr) {
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

    const node = new UpsertNode(parentNode, relExpr, upsert, current);
    this.nodes.push(node);

    if (parentNode) {
      parentNode.relations[relExpr.name] = parentNode.relations[relExpr.name] || [];
      parentNode.relations[relExpr.name].push(node);
    }

    // No need to build the graph down from a deleted node.
    if (node.type === UpsertNode.Type.Delete) {
      return;
    }

    relExpr.forEachChildExpression(modelClass.getRelations(), (expr, relation) => {
      const relUpsert = upsert && upsert[relation.name];
      const relCurrent = current && current[relation.name];

      this.buildGraphStep(relation.relatedModelClass, relUpsert, relCurrent, node, expr);
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
  if (Array.isArray(graph)) {
    return graph.map(root => root.$id());
  } else {
    return [graph.$id()];
  }
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