import _ from 'lodash';
import Promise from 'bluebird';

import DependencyGraph from './DependencyGraph';
import TableInsertion from './TableInsertion';

export default class GraphInserter {

  constructor({modelClass, models, allowedRelations, knex}) {
    /**
     * @type {Constructor.<Model>}
     */
    this.modelClass = modelClass;

    /**
     * @type {Model|Array.<Model>}
     */
    this.models = models;

    /**
     * @type {RelationExpression}
     */
    this.allowedRelations = allowedRelations || null;

    /**
     * @type {boolean}
     */
    this.done = false;

    /**
     * @type {DependencyGraph}
     */
    this.graph = this._buildDependencyGraph();

    /**
     * @type {knex}
     */
    this.knex = knex;
  }

  /**
   * @param {function(TableInsertion)} inserter
   * @return {Promise}
   */
  execute(inserter) {
    return this._executeNextBatch(inserter);
  }

  /**
   * @returns {DependencyGraph}
   * @private
   */
  _buildDependencyGraph() {
    let graph = new DependencyGraph(this.allowedRelations);
    graph.build(this.modelClass, this.models);
    return graph;
  }

  /**
   * @param {function(TableInsertion)} inserter
   * @returns {Promise}
   * @private
   */
  _executeNextBatch(inserter) {
    let batch = this._nextBatch();

    if (!batch) {
      // If we get here, we are done. All we need to do now is to finalize the object graph
      // and return it as the final output.
      return this._finalize();
    }

    // Insert the batch using the `inserter` function.
    return Promise.all(Object.keys(batch).map(tableName => {
      const tableInsertion = batch[tableName];
      let uids;

      if (!tableInsertion.isJoinTableInsertion) {
        // We need to omit the uid properties so that they don't get inserted
        // into the database. Join table insertions never have uids.
        uids = this._omitUids(tableInsertion);
      }

      return inserter(tableInsertion).then(() => {
        if (!tableInsertion.isJoinTableInsertion) {
          // Resolve dependencies to the inserted objects. Join table insertions
          // never resolve any dependencies.
          this._resolveDepsForInsertion(tableInsertion, uids);
        }
      });
    })).then(() => {
      return this._executeNextBatch(inserter);
    });
  }

  /**
   * @private
   * @returns {Object.<string, TableInsertion>}
   */
  _nextBatch() {
    if (this.done) {
      return null;
    }

    let batch = this._createBatch();

    if (_.isEmpty(batch)) {
      this.done = true;
      return this._createManyToManyRelationJoinRowBatch();
    } else {
      this._markBatchHandled(batch);
      return batch;
    }
  }

  /**
   * @private
   * @returns {Object.<string, TableInsertion>}
   */
  _createBatch() {
    let batch = Object.create(null);
    let nodes = this.graph.nodes;

    for (let n = 0, ln = nodes.length; n < ln; ++n) {
      let node = nodes[n];

      if (!node.handled && node.needs.length === node.numHandledNeeds) {
        let tableInsertion = batch[node.modelClass.tableName];

        if (!tableInsertion) {
          tableInsertion = new TableInsertion(node.modelClass, false);
          batch[node.modelClass.tableName] = tableInsertion;
        }

        tableInsertion.models.push(node.model);
        tableInsertion.isInputModel.push(!!this.graph.inputNodesById[node.id]);
      }
    }

    return batch;
  }

  /**
   * @private
   * @param {Object.<string, TableInsertion>} batch
   */
  _markBatchHandled(batch) {
    let models = _.flatten(_.map(batch, 'models'));
    let nodes = this.graph.nodesById;

    for (let m = 0, lm = models.length; m < lm; ++m) {
      let id = models[m][models[m].constructor.uidProp];
      let node = nodes[id];

      for (let nb = 0, lnb = node.isNeededBy.length; nb < lnb; ++nb) {
        let dep = node.isNeededBy[nb];
        dep.node.numHandledNeeds++;
      }

      node.handled = true;
    }
  }

  /**
   * @private
   * @returns {Object.<string, TableInsertion>}
   */
  _createManyToManyRelationJoinRowBatch() {
    let batch = Object.create(null);

    for (let n = 0, ln = this.graph.nodes.length; n < ln; ++n) {
      let node = this.graph.nodes[n];

      for (let m = 0, lm = node.manyToManyConnections.length; m < lm; ++m) {
        let conn = node.manyToManyConnections[m];
        let tableInsertion = batch[conn.relation.joinTable];

        let ownerProp = node.model.$values(conn.relation.ownerProp);
        let modelClass = conn.relation.joinTableModelClass(this.knex);
        let joinModel = conn.relation.createJoinModels(ownerProp, [conn.node.model])[0];

        if (conn.refNode) {
          // Also take extra properties from the referring model, it there was one.
          for (let k = 0, lk = conn.relation.joinTableExtraProps.length; k < lk; ++k) {
            let extraProp = conn.relation.joinTableExtraProps[k];

            if (!_.isUndefined(conn.refNode.model[extraProp])) {
              joinModel[extraProp] = conn.refNode.model[extraProp];
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

    const modelNames = Object.keys(batch);
    // Remove duplicates.
    for (let i = 0, l = modelNames.length; i < l; ++i) {
      const modelName = modelNames[i];
      const tableInsertion = batch[modelName];

      if (tableInsertion.models.length) {
        const keys = _.keys(tableInsertion.models[0]);

        tableInsertion.models = _.uniqBy(tableInsertion.models, model => model.$propKey(keys));
        tableInsertion.isInputModel = _.times(tableInsertion.models.length, _.constant(false));
      }
    }

    return batch;
  }

  /**
   * @private
   */
  _omitUids(tableInsertion) {
    let ids = _.map(tableInsertion.models, tableInsertion.modelClass.uidProp);

    for (let m = 0, lm = tableInsertion.models.length; m < lm; ++m) {
      tableInsertion.models[m].$omit(tableInsertion.modelClass.uidProp);
    }

    return ids;
  }

  /**
   * @private
   * @param {TableInsertion} tableInsertion
   * @param {Array.<string>} uids
   */
  _resolveDepsForInsertion(tableInsertion, uids) {
    for (let m = 0, lm = tableInsertion.models.length; m < lm; ++m) {
      let node = this.graph.nodesById[uids[m]];
      let model = tableInsertion.models[m];

      for (let d = 0, ld = node.isNeededBy.length; d < ld; ++d) {
        node.isNeededBy[d].resolve(model);
      }
    }
  }

  /**
   * @private
   * @return {Promise}
   */
  _finalize() {
    for (let n = 0, ln = this.graph.nodes.length; n < ln; ++n) {
      let refNode = this.graph.nodes[n];
      let ref = refNode.model[refNode.modelClass.uidRefProp];

      if (ref) {
        // Copy all the properties to the reference nodes.
        const actualNode = this.graph.nodesById[ref];
        const relations = actualNode.modelClass.getRelations();
        const keys = Object.keys(actualNode.model);

        for (let i = 0, l = keys.length; i < l; ++i) {
          const key = keys[i];
          const value = actualNode.model[key];

          if (!relations[key] && !_.isFunction(value)) {
            refNode.model[key] = value;
          }
        }

        refNode.model.$omit(refNode.modelClass.uidProp, refNode.modelClass.uidRefProp);
      }
    }

    return Promise.resolve(this.models);
  }
}