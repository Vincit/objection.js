'use strict';

const uniqBy = require('lodash/uniqBy');
const Promise = require('bluebird');

const DependencyGraph = require('./DependencyGraph');
const TableInsertion = require('./TableInsertion');

class GraphInserter {

  constructor(args) {
    this.allowedRelations = args.allowedRelations || null;
    this.modelClass = args.modelClass;
    this.models = args.models;
    this.knex = args.knex;

    this.graph = this._buildDependencyGraph();
  }

  execute(inserter) {
    return Promise.try(() => {
      return this._executeNormalBatches(inserter);
    }).then(() => {
      return this._executeJoinRowBatch(inserter);
    }).then(() => {
      return this._finalize();
    });
  }

  _buildDependencyGraph() {
    const graph = new DependencyGraph(this.allowedRelations);

    graph.build(this.modelClass, this.models);

    return graph;
  }

  _executeNormalBatches(inserter) {
    return this._executeNextBatch(inserter);
  }

  _executeNextBatch(inserter) {
    const batch = this._nextBatch();

    if (!batch) {
      // No more normal batches to execute.
      return null;
    }

    // Insert the batch one table at a time.
    return Promise.all(Object.keys(batch).map(tableName => {
      const tableInsertion = batch[tableName];
      // We need to omit the uid properties so that they don't get inserted
      // into the database.
      const uids = this._omitUids(tableInsertion);

      return inserter(tableInsertion).then(() => {
        // Resolve dependencies to the inserted objects.
        return this._resolveDepsForInsertion(tableInsertion, uids);
      });
    })).then(() => {
      return this._executeNextBatch(inserter);
    });
  }

  _nextBatch() {
    const batch = this._createBatch();

    if (batch) {
      this._markBatchHandled(batch);
    }
    
    return batch;
  }

  _createBatch() {
    const batch = Object.create(null);
    const nodes = this.graph.nodes;
    let empty = true;

    for (let n = 0, ln = nodes.length; n < ln; ++n) {
      const node = nodes[n];

      if (!node.handled && !node.hasUnresolvedDependencies) {
        let tableInsertion = batch[node.modelClass.tableName];

        if (!tableInsertion) {
          tableInsertion = new TableInsertion(node.modelClass, false);
          batch[node.modelClass.tableName] = tableInsertion;
        }

        tableInsertion.models.push(node.model);
        tableInsertion.isInputModel.push(!!this.graph.inputNodesById[node.id]);
        empty = false;
      }
    }

    if (empty) {
      return null;
    } else {
      return batch;
    }
  }

  _markBatchHandled(batch) {
    const tableNames = Object.keys(batch);
    const nodes = this.graph.nodesById;

    for (let t = 0, lt = tableNames.length; t < lt; ++t) {
      const tableInsertion = batch[tableNames[t]];
      const modelClass = tableInsertion.modelClass;
      const models = tableInsertion.models;

      for (let m = 0, lm = models.length; m < lm; ++m) {
        nodes[models[m][modelClass.uidProp]].markAsHandled();
      }
    }
  }

  _executeJoinRowBatch(inserter) {
    const batch = this._createJoinRowBatch();

    // Insert the batch one table at a time.
    return Promise.all(Object.keys(batch).map(tableName => {
      return inserter(batch[tableName]);
    }));
  }

  _createJoinRowBatch() {
    const batch = Object.create(null);

    for (let n = 0, ln = this.graph.nodes.length; n < ln; ++n) {
      const node = this.graph.nodes[n];

      for (let m = 0, lm = node.manyToManyConnections.length; m < lm; ++m) {
        const conn = node.manyToManyConnections[m];
        let tableInsertion = batch[conn.relation.joinTable];

        const ownerProp = node.model.$values(conn.relation.ownerProp);
        const modelClass = conn.relation.joinTableModelClass(this.knex);
        let joinModel = conn.relation.createJoinModels(ownerProp, [conn.node.model])[0];

        if (conn.refNode) {
          // Also take extra properties from the referring model, it there was one.
          for (let k = 0, lk = conn.relation.joinTableExtras.length; k < lk; ++k) {
            const extra = conn.relation.joinTableExtras[k];

            if (conn.refNode.model[extra.aliasProp] !== undefined) {
              joinModel[extra.joinTableProp] = conn.refNode.model[extra.aliasProp];
            }
          }
        }

        joinModel = modelClass.fromJson(joinModel);

        if (!tableInsertion) {
          tableInsertion = new TableInsertion(modelClass, true);
          batch[modelClass.tableName] = tableInsertion;
        }

        tableInsertion.models.push(joinModel);
        tableInsertion.isInputModel.push(false);
      }
    }

    return this._removeJoinRowDuplicatesFromBatch(batch);
  }

  _removeJoinRowDuplicatesFromBatch(batch) {
    const tableNames = Object.keys(batch);

    for (let t = 0, lt = tableNames.length; t < lt; ++t) {
      const tableName = tableNames[t];
      const tableInsertion = batch[tableName];

      if (tableInsertion.models.length) {
        const models = tableInsertion.models;
        const keyHash = Object.create(null);
        const keys = [];

        for (let m = 0, lm = models.length; m < lm; ++m) {
          const model = models[m];
          const modelKeys = Object.keys(model);

          for (let k = 0, lk = modelKeys.length; k < lk; ++k) {
            const key = modelKeys[k];

            if (!keyHash[key]) {
              keyHash[modelKeys[k]] = true;
              keys.push(key);
            }
          }
        }

        tableInsertion.models = uniqBy(models, model => model.$propKey(keys));
        tableInsertion.isInputModel = new Array(tableInsertion.models.length);
        tableInsertion.isInputModel.fill(false);
      }
    }

    return batch;
  }

  _omitUids(tableInsertion) {
    const ids = new Array(tableInsertion.models.length);
    const modelClass = tableInsertion.modelClass;
    const uidProp = modelClass.uidProp;

    for (let m = 0, lm = tableInsertion.models.length; m < lm; ++m) {
      const model = tableInsertion.models[m];
      
      ids[m] = model[uidProp];
      modelClass.omitImpl(model, uidProp);
    }

    return ids;
  }

  _resolveDepsForInsertion(tableInsertion, uids) {
    for (let m = 0, lm = tableInsertion.models.length; m < lm; ++m) {
      const node = this.graph.nodesById[uids[m]];
      const model = tableInsertion.models[m];

      for (let d = 0, ld = node.isNeededBy.length; d < ld; ++d) {
        node.isNeededBy[d].resolve(model);
      }
    }
  }

  _finalize() {
    for (let n = 0, ln = this.graph.nodes.length; n < ln; ++n) {
      const refNode = this.graph.nodes[n];
      const modelClass = refNode.modelClass;
      const ref = refNode.model[modelClass.uidRefProp];

      if (ref) {
        // Copy all the properties to the reference nodes.
        const actualNode = this.graph.nodesById[ref];
        const relations = actualNode.modelClass.getRelations();
        const keys = Object.keys(actualNode.model);

        for (let i = 0, l = keys.length; i < l; ++i) {
          const key = keys[i];
          const value = actualNode.model[key];

          if (!relations[key] && typeof value !== 'function') {
            refNode.model[key] = value;
          }
        }

        modelClass.omitImpl(refNode.model, modelClass.uidProp);
        modelClass.omitImpl(refNode.model, modelClass.uidRefProp);   
      } else if (refNode.model[modelClass.uidProp]) {
        // Make sure the model no longer has an uid.
        modelClass.omitImpl(refNode.model, modelClass.uidProp);
      }
    }

    return Promise.resolve(this.models);
  }
}

module.exports = GraphInserter;
