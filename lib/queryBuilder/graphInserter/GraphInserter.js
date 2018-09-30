const DependencyGraph = require('./DependencyGraph');
const TableInsertion = require('./TableInsertion');
const promiseUtils = require('../../utils/promiseUtils');
const { Type: ValidationErrorType } = require('../../model/ValidationError');
const { uniqBy, isFunction } = require('../../utils/objectUtils');

class GraphInserter {
  constructor(args) {
    this.allowedRelations = args.allowedRelations || null;
    this.queryContext = args.queryContext;
    this.modelClass = args.modelClass;
    this.models = args.models;
    this.knex = args.knex;
    this.opt = args.opt;
    this.graph = null;
  }

  buildDependencyGraph() {
    this.graph = this._buildDependencyGraph();
  }

  checkForCyclicReferences() {
    if (this.graph.hasCyclicReferences()) {
      throw this.modelClass.createValidationError({
        type: ValidationErrorType.InvalidGraph,
        message: 'the object graph contains cyclic references'
      });
    }
  }

  execute(inserter) {
    return promiseUtils
      .try(() => this._executeNormalBatches(inserter))
      .then(() => this._executeJoinRowBatch(inserter))
      .then(() => this._finalize());
  }

  _buildDependencyGraph() {
    const graph = new DependencyGraph(this.opt, this.allowedRelations);
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

    // Since we are not performing the inserts using relation.insert()
    // we need to explicitly run the beforeInsert hooks here.
    return this._beforeInsertBatch(batch, 'executeBeforeInsert')
      .then(() => {
        // Insert the batch one table at a time.
        return promiseUtils.map(
          Object.keys(batch),
          tableName => {
            const tableInsertion = batch[tableName];

            // We need to omit the uid properties so that they don't get inserted
            // into the database.
            this._omitUids(tableInsertion);

            return inserter(tableInsertion).then(() => {
              // Resolve dependencies to the inserted objects.
              return this._resolveDepsForInsertion(tableInsertion);
            });
          },
          { concurrency: this.modelClass.getConcurrency(this.knex) }
        );
      })
      .then(() => {
        return this._executeNextBatch(inserter);
      });
  }

  _nextBatch() {
    const batch = this._createBatch();

    if (batch) {
      // Mark the batch as inserted now even though the its is not yet inserted.
      // It is the very next thing we are going to do. We need to do this here
      // because the uid gets removed before insert.
      this._markBatchInserted(batch);
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
        let tableInsertion = batch[node.modelClass.getTableName()];

        if (!tableInsertion) {
          tableInsertion = new TableInsertion(node.modelClass, false);
          batch[node.modelClass.getTableName()] = tableInsertion;
        }

        tableInsertion.items.push({
          model: node.model,
          relation: node.relation,
          node
        });

        empty = false;
      }
    }

    if (empty) {
      return null;
    } else {
      return batch;
    }
  }

  _beforeInsertBatch(batch, executorMethod) {
    const tableNames = Object.keys(batch);
    const modelsByRelation = new Map();

    for (let t = 0, lt = tableNames.length; t < lt; ++t) {
      const tableName = tableNames[t];
      const tableInsertion = batch[tableName];

      for (let i = 0, li = tableInsertion.items.length; i < li; ++i) {
        const item = tableInsertion.items[i];
        const model = item.model;
        const relation = item.relation;

        if (relation) {
          let relModels = modelsByRelation.get(relation);

          if (relModels === undefined) {
            relModels = [];
            modelsByRelation.set(relation, relModels);
          }

          relModels.push(model);
        }
      }
    }

    return promiseUtils.map(
      Array.from(modelsByRelation.keys()),
      relation => {
        const models = modelsByRelation.get(relation);
        return relation[executorMethod](models, this.queryContext, null);
      },
      { concurrency: this.modelClass.getConcurrency(this.knex) }
    );
  }

  _markBatchInserted(batch) {
    const tableNames = Object.keys(batch);

    for (let t = 0, lt = tableNames.length; t < lt; ++t) {
      const tableInsertion = batch[tableNames[t]];
      const items = tableInsertion.items;

      for (let i = 0, li = items.length; i < li; ++i) {
        items[i].node.markAsInserted();
      }
    }
  }

  _executeJoinRowBatch(inserter) {
    const batch = this._createJoinRowBatch();

    // Since we are not performing the inserts using relation.insert()
    // we need to explicitly run the beforeInsert hooks here.
    return this._beforeInsertBatch(batch, 'executeJoinTableBeforeInsert').then(() => {
      // Insert the batch one table at a time.
      return promiseUtils.map(Object.keys(batch), tableName => inserter(batch[tableName]), {
        concurrency: this.modelClass.getConcurrency(this.knex)
      });
    });
  }

  _createJoinRowBatch() {
    const batch = Object.create(null);

    for (let n = 0, ln = this.graph.nodes.length; n < ln; ++n) {
      const node = this.graph.nodes[n];

      for (let m = 0, lm = node.manyToManyConnections.length; m < lm; ++m) {
        const conn = node.manyToManyConnections[m];
        let tableInsertion = batch[conn.relation.joinTable];

        const ownerProp = conn.relation.ownerProp.getProps(node.model);
        const modelClass = conn.relation.getJoinModelClass(this.knex);
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
          batch[modelClass.getTableName()] = tableInsertion;
        }

        tableInsertion.items.push({
          model: joinModel,
          relation: conn.relation,
          node: conn.node
        });
      }
    }

    return this._removeJoinRowDuplicatesFromBatch(batch);
  }

  _removeJoinRowDuplicatesFromBatch(batch) {
    const tableNames = Object.keys(batch);

    for (let t = 0, lt = tableNames.length; t < lt; ++t) {
      const tableName = tableNames[t];
      const tableInsertion = batch[tableName];

      if (tableInsertion.items.length) {
        const items = tableInsertion.items;
        const keySet = new Set();
        const keys = [];

        for (let i = 0, li = items.length; i < li; ++i) {
          const item = items[i];
          const model = item.model;
          const modelKeys = Object.keys(model);

          for (let k = 0, lk = modelKeys.length; k < lk; ++k) {
            const key = modelKeys[k];

            if (!keySet.has(key)) {
              keySet.add(modelKeys[k]);
              keys.push(key);
            }
          }
        }

        tableInsertion.items = uniqBy(items, item => item.model.$propKey(keys));
      }
    }

    return batch;
  }

  _omitUids(tableInsertion) {
    const modelClass = tableInsertion.modelClass;
    const uidProp = modelClass.uidProp;

    for (let i = 0, li = tableInsertion.items.length; i < li; ++i) {
      const item = tableInsertion.items[i];
      const model = item.model;

      modelClass.omitImpl(model, uidProp);
    }
  }

  _resolveDepsForInsertion(tableInsertion) {
    for (let i = 0, li = tableInsertion.items.length; i < li; ++i) {
      const node = tableInsertion.items[i].node;
      const model = tableInsertion.items[i].model;

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
        const actualNode = this.graph.nodesById.get(ref);
        const relations = actualNode.modelClass.getRelations();
        const keys = Object.keys(actualNode.model);

        for (let i = 0, l = keys.length; i < l; ++i) {
          const key = keys[i];
          const value = actualNode.model[key];

          if (!relations[key] && !isFunction(value)) {
            refNode.model[key] = value;
          }
        }

        modelClass.omitImpl(refNode.model, modelClass.uidProp);
        modelClass.omitImpl(refNode.model, modelClass.uidRefProp);
        modelClass.omitImpl(refNode.model, modelClass.dbRefProp);
      } else if (refNode.model[modelClass.uidProp]) {
        // Make sure the model no longer has an uid.
        modelClass.omitImpl(refNode.model, modelClass.uidProp);
        modelClass.omitImpl(refNode.model, modelClass.dbRefProp);
      }
    }

    return Promise.resolve(this.models);
  }
}

module.exports = GraphInserter;
