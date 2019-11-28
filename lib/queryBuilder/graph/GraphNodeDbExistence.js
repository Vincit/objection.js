'use strict';

const { GraphData } = require('./GraphData');
const { GraphAction } = require('./GraphAction');
const promiseUtils = require('../../utils/promiseUtils');

/**
 * This weird little class is responsible for checking (and maintaining information)
 * whether certain nodes exist in the database.
 *
 * Note that this information is only calculated for nodes for which `insertMissing`
 * option is true.
 */
class GraphNodeDbExistence {
  static createEveryNodeExistsExistence() {
    return new GraphNodeDbExistence(new Map());
  }

  /**
   * Goes through the graphs and identifies nodes that may not exist in the db
   * (nodes that have an id, but are not found in `currentGraph`) and
   * creates an instance of GraphNodeDbExistence that can be used to
   * synchronously check if a node exist in the database.
   */
  static async create({ builder, graph, graphOptions, currentGraph }) {
    if (graphOptions.isInsertOnly()) {
      // With insertGraph, we never want to do anything but inserts.
      return GraphNodeDbExistence.createEveryNodeExistsExistence();
    }

    const graphData = new GraphData({
      graph,
      graphOptions,
      currentGraph,
      // We don't yet have an instance of GraphNodeDbExistence since we are
      // creating one. We can (and should) safely use an instance that
      // assumes that all nodes exist in the db for the purposes of this
      // method.
      nodeDbExistence: GraphNodeDbExistence.createEveryNodeExistsExistence()
    });

    const { mayNotExist, mayNotExistNodes } = createMayNotExistMap(graphData);

    if (mayNotExist.size == 0) {
      // Early exit if we found no items for which we should check their
      // existence in the db.
      return GraphNodeDbExistence.createEveryNodeExistsExistence();
    }

    const dontExist = await createDontExistMap({ builder, mayNotExist, mayNotExistNodes });

    return new GraphNodeDbExistence(dontExist);
  }

  constructor(dontExist) {
    this.dontExist = dontExist;
  }

  doesNodeExistInDb(node) {
    const idMap = this.dontExist.get(node.modelClass);

    if (!idMap) {
      return true;
    }

    return !idMap.has(node.obj.$idKey());
  }
}

function createMayNotExistMap(graphData) {
  const { graph, currentGraph, graphOptions } = graphData;

  const mayNotExist = new Map();
  const mayNotExistNodes = [];

  for (const node of graph.nodes) {
    if (
      // As an optimization, only consider nodes for which `insertMissing` is true.
      // We only need the information for those nodes.
      graphOptions.shouldInsertMissing(node) &&
      // Only consider nodes that will be related. We don't consider nodes that
      // would get inserted with an id. Those will still result in a unique
      // constraint error.
      graphOptions.shouldRelate(node, graphData) &&
      // Relate nodes may not have an id if they are `#ref` nodes. Only consider
      // nodes that have an id so that we can check the existence.
      node.hasId &&
      // We can ignore nodes if they are found anywhere in the graph. `shouldRelate`
      // only checks if the node is found in the same relation.
      !hasNodeById(currentGraph, node)
    ) {
      if (!mayNotExist.has(node.modelClass)) {
        mayNotExist.set(node.modelClass, new Map());
      }

      mayNotExist.get(node.modelClass).set(node.obj.$idKey(), node.obj.$id());
      mayNotExistNodes.push(node);
    }
  }

  return {
    mayNotExist,
    mayNotExistNodes
  };
}

function hasNodeById(currentGraph, nodeToFind) {
  const { modelClass } = nodeToFind;

  const tableToFind = modelClass.getTableName();
  const idProps = modelClass.getIdPropertyArray();

  return currentGraph.nodes.some(node => {
    return (
      node.modelClass.getTableName() === tableToFind &&
      idProps.every(idProp => node.obj[idProp] === nodeToFind.obj[idProp])
    );
  });
}

async function createDontExistMap({ builder, mayNotExist, mayNotExistNodes }) {
  const dontExist = cloneExistenceMap(mayNotExist);
  const existenceCheckQueries = createExistenceCheckQueries({ builder, mayNotExist });

  const results = await promiseUtils.map(existenceCheckQueries, builder => builder.execute(), {
    concurrency: GraphAction.getConcurrency(builder, mayNotExistNodes)
  });

  // Remove all items from the mayNotExist map that we have just proven to exist
  // by executing the existenceCheckQueries.
  for (const modelResult of results) {
    for (const item of modelResult) {
      const modelClass = item.constructor;
      const idMap = dontExist.get(modelClass);
      // Exist, remove from the map.
      idMap.delete(item.$idKey());
    }
  }

  // Now only items that don't exist in the db are left in this map.
  return dontExist;
}

function createExistenceCheckQueries({ builder, mayNotExist }) {
  const builders = [];

  for (const [modelClass, idMap] of mayNotExist.entries()) {
    const ids = Array.from(idMap.values());

    // Create one query per model class (table) to fetch the identifiers
    // of the nodes that may not exist. These queries should be super fast
    // since they come straight from the index.
    builders.push(
      modelClass
        .query()
        .childQueryOf(builder, childQueryOptions())
        .findByIds(ids)
        .select(modelClass.getIdColumnArray())
    );
  }

  return builders;
}

function childQueryOptions() {
  return {
    fork: true,
    isInternalQuery: true
  };
}

function cloneExistenceMap(exixtenseMap) {
  const clone = new Map(exixtenseMap);

  for (const modelClass of clone.keys()) {
    clone.set(modelClass, new Map(clone.get(modelClass)));
  }

  return clone;
}

module.exports = {
  GraphNodeDbExistence
};
