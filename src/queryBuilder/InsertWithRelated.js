import _ from 'lodash';
import Promise from 'bluebird';
import RelationExpression from './RelationExpression';
import ManyToManyRelation from '../relations/ManyToManyRelation';
import OneToManyRelation from '../relations/OneToManyRelation';
import OneToOneRelation from '../relations/OneToOneRelation';
import ValidationError from '../ValidationError';
let Model;

/**
 * Given an model with nested relations, finds a fast way to insert the models into
 * database so that not-null constraints are not broken.
 *
 * @ignore
 */
export default class InsertWithRelated {

  constructor({modelClass, models, allowedRelations}) {
    // Lazy-load Model.
    Model = Model || require('./../model/Model').default;

    this.modelClass = modelClass;
    this.models = models;
    this.allowedRelations = allowedRelations || null;
    this.done = false;
    this.graph = this._buildDependencyGraph();
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
    return Promise.all(_.map(batch, tableInsertion => {
      let uids;

      if (!tableInsertion.isJoinTableInsertion) {
        // We need to omit the uid properties so that they don't get inserted
        // into the database. Join table insertions never have uids.
        uids = this._omitUids(tableInsertion);
      }

      return inserter(tableInsertion).then(() => {
        if (!tableInsertion.isJoinTableInsertion) {
          // Resolve dependencies to the inserted objects.
          this._resolveDepsForInsertion(tableInsertion, uids);
        }
      });
    })).then(() => this._executeNextBatch(inserter));
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
        let tableInsertion = getTableInsertion(batch, node.modelClass.tableName);

        if (!tableInsertion) {
          tableInsertion = new TableInsertion(node.modelClass, false);
          setTableInsertion(batch, node.modelClass.tableName, tableInsertion)
        }

        tableInsertion.models.push(node.model);
        tableInsertion.isInputModel.push(isInputNode(this.graph.inputNodesById, node));
      }
    }

    return batch;
  }

  /**
   * @private
   * @param {Object.<string, TableInsertion>} batch
   */
  _markBatchHandled(batch) {
    let models = _.flatten(_.pluck(batch, 'models'));
    let nodes = this.graph.nodesById;

    for (let m = 0, lm = models.length; m < lm; ++m) {
      let id = getUid(models[m]);
      let node = getNode(nodes, id);

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
        let tableInsertion = getTableInsertion(batch, conn.relation.joinTable);

        let sourceVal = node.model.$values(conn.relation.ownerProp);
        let targetVal = conn.node.model.$values(conn.relation.relatedProp);

        let joinModel = {};
        let knex = conn.relation.ownerModelClass.knex();
        let modelClass = conn.relation.joinTableModelClass;

        if (knex) {
          // TODO: Because the joinTableModelClass may have been created inside ManyToManyRelation, it may not be bound. We really should not have to know about it here...
          modelClass = modelClass.bindKnex(knex);
        }

        for (let i = 0; i < sourceVal.length; ++i) {
          joinModel[conn.relation.joinTableOwnerProp[i]] = sourceVal[i];
        }

        for (let i = 0; i < targetVal.length; ++i) {
          joinModel[conn.relation.joinTableRelatedProp[i]] = targetVal[i];
        }

        joinModel = modelClass.fromJson(joinModel);

        if (!tableInsertion) {
          tableInsertion = new TableInsertion(modelClass, true);
          setTableInsertion(batch, modelClass.tableName, tableInsertion)
        }

        tableInsertion.models.push(joinModel);
        tableInsertion.isInputModel.push(false);
      }
    }

    // Remove duplicates.
    _.each(batch, tableInsertion => {
      if (tableInsertion.models.length) {
        let keys = _.keys(tableInsertion.models[0]);
        tableInsertion.models = _.unique(tableInsertion.models, model => model.$values(keys).join());
        tableInsertion.isInputModel = _.times(tableInsertion.models.length, _.constant(false));
      }
    });

    return batch;
  }

  /**
   * @private
   */
  _omitUids(tableInsertion) {
    let ids = _.pluck(tableInsertion.models, tableInsertion.modelClass.uidProp);

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
      let node = getNode(this.graph.nodesById, uids[m]);
      let model = tableInsertion.models[m];

      for (let d = 0, ld = node.isNeededBy.length; d < ld; ++d) {
        let dep = node.isNeededBy[d];
        dep.resolve(model);
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
      let ref = getUidRef(refNode.model);

      if (ref) {
        // Copy all the properties to the reference nodes.
        let actualNode = getNode(this.graph.nodesById, ref);
        let relations = actualNode.modelClass.getRelations();

        _.each(actualNode.model, (value, key) => {
          if (!getRelation(relations, key) && !_.isFunction(value)) {
            refNode.model[key] = value;
          }
        });

        refNode.model.$omit(refNode.modelClass.uidProp, refNode.modelClass.uidRefProp);
      }
    }

    return Promise.resolve(this.models);
  }
}

function TableInsertion(modelClass, isJoinTableInsertion) {
  this.modelClass = modelClass;
  this.isJoinTableInsertion = isJoinTableInsertion;
  this.models = [];
  this.isInputModel = [];
}

function DependencyNode(model, modelClass) {
  this.id = getUid(model);
  this.model = model;
  this.modelClass = modelClass;

  this.needs = [];
  this.isNeededBy = [];
  this.manyToManyConnections = [];

  this.numHandledNeeds = 0;
  this.handled = false;
  this.visited = false;
  this.recursion = false;
}

function Dependency(node, resolve) {
  this.node = node;
  this.resolve = resolve;
}

function ManyToManyConnection(node, relation) {
  this.node = node;
  this.relation = relation;
}

function DependencyGraph(allowedRelations) {
  this.allowedRelations = allowedRelations;
  this.nodesById = Object.create(null);
  this.inputNodesById = Object.create(null);
  this.nodes = [];
  this.uid = 0;
}

DependencyGraph.prototype.build = function (modelClass, models) {
  let self = this;

  this.nodesById = Object.create(null);
  this.nodes = [];

  if (_.isArray(models)) {
    _.each(models, function (model) {
      self.buildForModel(modelClass, model, null, null, self.allowedRelations);
    });
  } else {
    this.buildForModel(modelClass, models, null, null, this.allowedRelations);
  }

  this.solveReferences();
  this.createNonRelationDeps();

  if (this.isCyclic(this.nodes)) {
    throw new ValidationError({cyclic: 'the object graph contains cyclic references'});
  }

  return this.nodes;
};

DependencyGraph.prototype.buildForModel = function (modelClass, model, parentNode, rel, allowedRelations) {
  if (!(model instanceof Model)) {
    throw new ValidationError({notModel: 'the object graph contains cyclic references'});
  }

  if (!getUid(model)) {
    setUid(model, '__objection_uid(' + (++this.uid) + ')__');
  }

  let node = new DependencyNode(model, modelClass);

  this.nodesById[node.id] = node;
  this.nodes.push(node);

  if (!parentNode) {
    this.inputNodesById[node.id] = node;
  }

  if (rel instanceof OneToManyRelation) {

    node.needs.push(new Dependency(parentNode, function (model) {
      for (let i = 0; i < rel.relatedProp.length; ++i) {
        model[rel.relatedProp[i]] = this.node.model[rel.ownerProp[i]];
      }
    }));

    parentNode.isNeededBy.push(new Dependency(node, function (model) {
      for (let i = 0; i < rel.relatedProp.length; ++i) {
        this.node.model[rel.relatedProp[i]] = model[rel.ownerProp[i]];
      }
    }));

  } else if (rel instanceof OneToOneRelation) {

    node.isNeededBy.push(new Dependency(parentNode, function (model) {
      for (let i = 0; i < rel.relatedProp.length; ++i) {
        this.node.model[rel.ownerProp[i]] = model[rel.relatedProp[i]];
      }
    }));

    parentNode.needs.push(new Dependency(node, function (model) {
      for (let i = 0; i < rel.relatedProp.length; ++i) {
        model[rel.ownerProp[i]] = this.node.model[rel.relatedProp[i]];
      }
    }));

  } else if (rel instanceof ManyToManyRelation) {
    // ManyToManyRelations create no dependencies since we can create the
    // join table rows after everything else has been inserted.
    parentNode.manyToManyConnections.push(new ManyToManyConnection(node, rel));
  } else if (rel) {
    throw new Error('unsupported relation type "' + (rel.constructor && rel.constructor.name) + '"');
  }

  this.buildForRelations(modelClass, model, node, allowedRelations);
};

DependencyGraph.prototype.buildForRelations = function (modelClass, model, node, allowedRelations) {
  let relations = modelClass.getRelations();

  for (let relName in relations) {
    let rel = getRelation(relations, relName);
    let relModels = getRelated(model, relName);
    let nextAllowed = null;

    if (relModels && allowedRelations instanceof RelationExpression) {
      nextAllowed = allowedRelations.childExpression(relName);

      if (!nextAllowed) {
        throw new ValidationError({allowedRelations: 'trying to insert an unallowed relation'});
      }
    }

    if (_.isArray(relModels)) {
      for (let i = 0, l = relModels.length; i < l; ++i) {
        this.buildForModel(rel.relatedModelClass, relModels[i], node, rel, nextAllowed);
      }
    } else if (relModels) {
      this.buildForModel(rel.relatedModelClass, relModels, node, rel, nextAllowed);
    }
  }
};

DependencyGraph.prototype.solveReferences = function () {
  let refMap = Object.create(null);

  // First merge all reference nodes into the actual node.
  this.mergeReferences(refMap);

  // Replace all reference nodes with the actual nodes.
  this.replaceReferenceNodes(refMap);
};

DependencyGraph.prototype.mergeReferences = function (refMap) {
  for (let n = 0, ln = this.nodes.length; n < ln; ++n) {
    let refNode = this.nodes[n];

    if (refNode.handled) {
      continue;
    }

    let ref = getUidRef(refNode.model);

    if (ref) {
      let actualNode = getNode(this.nodesById, ref);

      if (!actualNode) {
        throw new ValidationError({ref: 'could not resolve reference "' + ref + '"'});
      }

      let d, ld;

      for (d = 0, ld = refNode.needs.length; d < ld; ++d) {
        actualNode.needs.push(refNode.needs[d]);
      }

      for (d = 0, ld = refNode.isNeededBy.length; d < ld; ++d) {
        actualNode.isNeededBy.push(refNode.isNeededBy[d]);
      }

      for (let m = 0, lm = refNode.manyToManyConnections.length; m < lm; ++m) {
        actualNode.manyToManyConnections.push(refNode.manyToManyConnections[m]);
      }

      setRefMap(refMap, refNode.id, actualNode);

      refNode.handled = true;
    }
  }
};

DependencyGraph.prototype.replaceReferenceNodes = function (refMap) {
  for (let n = 0, ln = this.nodes.length; n < ln; ++n) {
    let node = this.nodes[n];
    let d, ld, dep, actualNode;

    for (d = 0, ld = node.needs.length; d < ld; ++d) {
      dep = node.needs[d];
      actualNode = getRefMap(refMap, dep.node.id);

      if (actualNode) {
        dep.node = actualNode;
      }
    }

    for (d = 0, ld = node.isNeededBy.length; d < ld; ++d) {
      dep = node.isNeededBy[d];
      actualNode = getRefMap(refMap, dep.node.id);

      if (actualNode) {
        dep.node = actualNode;
      }
    }

    for (let m = 0, lm = node.manyToManyConnections.length; m < lm; ++m) {
      let conn = node.manyToManyConnections[m];
      actualNode = getRefMap(refMap, conn.node.id);

      if (actualNode) {
        conn.node = actualNode;
      }
    }
  }
};

DependencyGraph.prototype.createNonRelationDeps = function () {
  for (let n = 0, ln = this.nodes.length; n < ln; ++n) {
    let node = this.nodes[n];

    if (!node.handled) {
      this.createNonRelationDepsForObject(node.model, node, []);
    }
  }
};

DependencyGraph.prototype.createNonRelationDepsForObject = function (obj, node, path) {
  let propRefRegex = node.modelClass.propRefRegex;
  let relations = node.modelClass.getRelations();
  let isModel = obj instanceof Model;
  let self = this;

  _.each(obj, function (value, key) {
    if (isModel && getRelation(relations, key)) {
      // Don't traverse the relations of model instances.
      return;
    }

    path.push(key);

    if (_.isString(value)) {
      allMatches(propRefRegex, value, function (matchResult) {
        let match = matchResult[0];
        let refId = matchResult[1];
        let refProp = matchResult[2];
        let pathClone = path.slice();
        let refNode = self.nodesById[refId];

        if (!refNode) {
          throw new ValidationError({ref: 'could not resolve reference "' + value + '"'});
        }

        if (value === match) {
          // If the match is the whole string, replace the value with the resolved value.
          // This means that the value will have the same type as the resolved value
          // (date, number, etc).
          node.needs.push(new Dependency(refNode, function (model) {
            _.set(model, pathClone, this.node.model[refProp]);
          }));
          refNode.isNeededBy.push(new Dependency(node, function (model) {
            _.set(this.node.model, pathClone, model[refProp]);
          }));
        } else {
          // If the match is inside a string, replace the reference inside the string with
          // the resolved value.
          node.needs.push(new Dependency(refNode, function (model) {
            value = value.replace(match, this.node.model[refProp]);
            _.set(model, pathClone, value);
          }));
          refNode.isNeededBy.push(new Dependency(node, function (model) {
            value = value.replace(match, model[refProp]);
            _.set(this.node.model, pathClone, value);
          }));
        }
      });
    } else if (_.isObject(value)) {
      self.createNonRelationDepsForObject(value, node, path);
    }

    path.pop();
  });
};

DependencyGraph.prototype.isCyclic = function (nodes) {
  let isCyclic = false;

  for (let n = 0, ln = nodes.length; n < ln; ++n) {
    let node = nodes[n];

    if (node.handled) {
      return;
    }

    if (this.isCyclicNode(node)) {
      isCyclic = true;
      break;
    }
  }

  this.clearFlags(this.nodes);
  return isCyclic;
};

DependencyGraph.prototype.isCyclicNode = function (node) {
  if (!node.visited) {
    node.visited = true;
    node.recursion = true;

    for (let d = 0, ld = node.needs.length; d < ld; ++d) {
      let dep = node.needs[d];

      if (!dep.node.visited && this.isCyclicNode(dep.node)) {
        return true;
      } else if (dep.node.recursion) {
        return true;
      }
    }
  }

  node.recursion = false;
  return false;
};

DependencyGraph.prototype.clearFlags = function (nodes) {
  for (let n = 0, ln = nodes.length; n < ln; ++n) {
    let node = nodes[n];

    node.visited = false;
    node.recursion = false;
  }
};

function getNode(nodes, id) {
  return nodes[id];
}

function getRefMap(refMap, refId) {
  return refMap[refId];
}

function setRefMap(refMap, refId, actualId) {
  refMap[refId] = actualId;
}

function getRelated(model, relName) {
  return model[relName];
}

function getRelation(relations, relName) {
  return relations[relName];
}

function getTableInsertion(batch, table) {
  return batch[table];
}

function setTableInsertion(batch, table, insertion) {
  batch[table] = insertion;
}

function getUidRef(model) {
  return model[model.constructor.uidRefProp];
}

function getUid(model) {
  return model[model.constructor.uidProp];
}

function setUid(model, id) {
  return model[model.constructor.uidProp] = id;
}

function isInputNode(inputNodesById, node) {
  return !!inputNodesById[node.id];
}

function allMatches(regex, str, cb) {
  let matchResult = regex.exec(str);

  while (matchResult) {
    cb(matchResult);
    matchResult = regex.exec(str);
  }
}
