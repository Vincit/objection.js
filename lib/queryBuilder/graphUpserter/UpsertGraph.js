const keyBy = require('lodash/keyBy');
const difference = require('lodash/difference');
const RelationExpression = require('../RelationExpression');
const UpsertNode = require('./UpsertNode');

const { isSqlite } = require('../../utils/knexUtils');
const { asArray } = require('../../utils/objectUtils');
const { getDataPath } = require('../../utils/dataPath');
const { Type: ValidationErrorType } = require('../../model/ValidationError');

// Given an upsert model graph, creates a set of nodes that describe what to do
// to each individual model in the graph. node.types returns the needed actions
// (any of insert, relate, update, delete and unrelate). This class determines
// the needed actions by fetching the current state of the graph from the
// database. Only ids and foreign keys needed by the relations are fetched.
class UpsertGraph {
  constructor(upsert, isArray, opt) {
    this.upsert = upsert;
    this.isArray = isArray;
    this.rootModelClass = this.upsert[0].constructor;
    this.relExpr = RelationExpression.fromGraph(upsert);
    this.nodes = [];
    // Keys are upsert models and values are corresponding nodes.
    this.nodesByUpsert = new Map();
    this.opt = opt || {};
  }

  build(builder) {
    return this.fetchCurrentState(builder).then(currentState => this.buildGraph(currentState));
  }

  // Fetches the current state of the graph from the database. This method
  // only fetches ids and all foreign keys needed by the relations.
  fetchCurrentState(builder) {
    const rootIds = getRootIds(this.upsert);
    const rootIdCols = builder.fullIdColumnFor(this.rootModelClass);
    const allowedExpr = builder.allowedUpsertExpression();
    const oldContext = builder.context();

    if (allowedExpr && !allowedExpr.isSubExpression(this.relExpr)) {
      const modelClass = builder.modelClass();

      throw modelClass.createValidationError({
        type: ValidationErrorType.UnallowedRelation,
        message: 'trying to upsert an unallowed relation'
      });
    }

    if (rootIds.length === 0) {
      return Promise.resolve([]);
    }

    return builder
      .modelClass()
      .query()
      .childQueryOf(builder, true)
      .whereInComposite(rootIdCols, rootIds)
      .eager(this.relExpr)
      .internalOptions({
        keepImplicitJoinProps: true
      })
      .mergeContext({
        onBuild(builder) {
          // There may be an onBuild hook in the old context.
          if (oldContext.onBuild) {
            oldContext.onBuild(builder);
          }

          const modelClass = builder.modelClass();
          const idColumn = builder.fullIdColumnFor(modelClass);

          builder.select(idColumn);
        }
      });
  }

  buildGraph(current) {
    this.doBuildGraph(
      this.rootModelClass,
      this.upsert,
      current,
      this.isArray,
      null,
      this.relExpr,
      null
    );
  }

  doBuildGraph(modelClass, upsert, current, isArray, parentNode, relExpr, dataPath) {
    this.buildGraphArray(
      modelClass,
      ensureArray(upsert),
      ensureArray(current),
      isArray,
      parentNode,
      relExpr,
      dataPath
    );
  }

  buildGraphArray(modelClass, upsert, current, isArray, parentNode, relExpr, dataPath) {
    const idProp = modelClass.getIdPropertyArray();

    const upsertById = keyBy(upsert, model => model.$propKey(idProp));
    const currentById = keyBy(current, model => model.$propKey(idProp));

    upsert.forEach((upsert, index) => {
      const key = upsert.$propKey(idProp);
      const current = currentById[key];
      const path = isArray ? getDataPath(dataPath, index) : dataPath;
      this.buildGraphSingle(modelClass, upsert, current, parentNode, relExpr, path);
    });

    current.forEach(current => {
      const key = current.$propKey(idProp);
      const upsert = upsertById[key];
      if (!upsert) {
        // These nodes result in delete and unrelate operations and nothing gets validated.
        // Use an index of -1  for dataPath here, as it should never actually get used.
        const path = isArray ? getDataPath(dataPath, -1) : dataPath;
        this.buildGraphSingle(modelClass, upsert, current, parentNode, relExpr, path);
      }
    });
  }

  buildGraphSingle(modelClass, upsert, current, parentNode, relExpr, dataPath) {
    if (!upsert && !current) {
      return;
    }

    const node = new UpsertNode(parentNode, relExpr, upsert, current, dataPath, this.opt);
    this.nodes.push(node);

    if (upsert) {
      this.nodesByUpsert.set(upsert, node);
    }

    if (parentNode) {
      const relations = parentNode.relations;
      const relation = (relations[relExpr.name] = relations[relExpr.name] || []);
      relation.push(node);
    }

    // No need to build the graph down from a deleted node.
    if (node.upsertModel === null) {
      return;
    }

    relExpr.forEachChildExpression(modelClass.getRelations(), (expr, relation) => {
      const name = relation.name;
      const relUpsert = upsert && upsert[name];
      const relCurrent = current && current[name];

      this.doBuildGraph(
        relation.relatedModelClass,
        relUpsert,
        relCurrent,
        Array.isArray(relUpsert),
        node,
        expr,
        getDataPath(dataPath, name)
      );
    });
  }
}

function getRootIds(graph) {
  return asArray(graph)
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
