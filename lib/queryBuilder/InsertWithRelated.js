'use strict';

var _ = require('lodash')
  , Promise = require('bluebird')
  , RelationExpression = require('./RelationExpression')
  , ManyToManyRelation = require('./../relations/ManyToManyRelation')
  , OneToManyRelation = require('./../relations/OneToManyRelation')
  , OneToOneRelation = require('./../relations/OneToOneRelation')
  , ValidationError = require('./../ValidationError')
  , Model;

/**
 * Given an model with nested relations, finds a fast way to insert the models into
 * database so that not-null constraints are not broken.
 *
 * This class assumes that all foreign key references have a not-null constraint.
 *
 * By the way, the code in this module is ugly as hell because of stupid micro-optimizations :|
 *
 * @constructor
 * @ignore
 */
function InsertWithRelated(opt) {
  // Lazy-load Model.
  Model = Model || require('./../model/Model');

  this.modelClass = opt.modelClass;
  this.models = opt.models;
  this.allowedRelations = opt.allowedRelations || null;
  this.graph = this._buildDependencyGraph();
  this.done = false;
}

/**
 * @returns {DependencyGraph}
 * @private
 */
InsertWithRelated.prototype._buildDependencyGraph = function () {
  var graph = new DependencyGraph(this.allowedRelations);
  graph.build(this.modelClass, this.models);
  return graph;
};

InsertWithRelated.prototype.execute = function (inserter) {
  return this.executeNextBatch(inserter);
};

InsertWithRelated.prototype.executeNextBatch = function (inserter) {
  var self = this;
  var batch = this.nextBatch();

  if (!batch) {
    // TODO turn this into a function.
    for (var n = 0, ln = this.graph.nodes.length; n < ln; ++n) {
      var refNode = this.graph.nodes[n];
      var ref = getUidRef(refNode.model);

      if (ref) {
        // Copy all the properties to the reference nodes.
        var actualNode = getNode(this.graph.nodesById, ref);
        var relations = actualNode.modelClass.getRelations();

        _.each(actualNode.model, function (value, key) {
          if (!getRelation(relations, key) && !_.isFunction(value)) {
            refNode.model[key] = value;
          }
        });

        refNode.model.$omit(refNode.modelClass.uidProp, refNode.modelClass.uidRefProp);
      }
    }

    return Promise.resolve(this.models);
  }

  return Promise.all(_.map(batch, function (tableInsertion) {
    var ids;

    // If the insertion is a model insertion instead of join row insertion,
    // we need to delete the uid properties so that they don't get inserted
    // into the database.
    if (tableInsertion.modelClass) {
      ids = _.pluck(tableInsertion.models, tableInsertion.modelClass.uidProp);

      for (var m = 0, lm = tableInsertion.models.length; m < lm; ++m) {
        tableInsertion.models[m].$omit(tableInsertion.modelClass.uidProp);
      }
    }

    return inserter(tableInsertion).then(function () {
      if (!tableInsertion.modelClass) {
        // The Many to many join row table insertions don't have a modelClass.
        return;
      }

      for (var m = 0, lm = tableInsertion.models.length; m < lm; ++m) {
        var node = getNode(self.graph.nodesById, ids[m]);
        var model = tableInsertion.models[m];

        for (var d = 0, ld = node.isNeededBy.length; d < ld; ++d) {
          var dep = node.isNeededBy[d];
          dep.resolve(model);
        }
      }
    });
  })).then(function () {
    return self.executeNextBatch(inserter);
  })
};

InsertWithRelated.prototype.nextBatch = function () {
  if (this.done) {
    return null;
  }

  var batch = this.createBatch();

  if (_.isEmpty(batch)) {
    this.done = true;
    return this.createManyToManyRelationJoinRowBatch();
  } else {
    this.markBatchHandled(batch);
    return batch;
  }
};

InsertWithRelated.prototype.createBatch = function () {
  var batch = Object.create(null);
  var nodes = this.graph.nodes;

  for (var n = 0, ln = nodes.length; n < ln; ++n) {
    var node = nodes[n];

    if (!node.handled && node.needs.length === node.numHandledNeeds) {
      var tableInsertion = getTableInsertion(batch, node.modelClass.tableName);

      if (!tableInsertion) {
        tableInsertion = new TableInsertion(node.modelClass, node.modelClass.tableName);
        setTableInsertion(batch, node.modelClass.tableName, tableInsertion)
      }

      tableInsertion.models.push(node.model);
      tableInsertion.isInputModel.push(isInputNode(this.graph.inputNodesById, node));
    }
  }

  return batch;
};

InsertWithRelated.prototype.markBatchHandled = function (batch) {
  var models = _.flatten(_.pluck(batch, 'models'));
  var nodes = this.graph.nodesById;

  for (var m = 0, lm = models.length; m < lm; ++m) {
    var id = getUid(models[m]);
    var node = getNode(nodes, id);

    for (var nb = 0, lnb = node.isNeededBy.length; nb < lnb; ++nb) {
      var dep = node.isNeededBy[nb];
      dep.node.numHandledNeeds++;
    }

    node.handled = true;
  }
};

InsertWithRelated.prototype.createManyToManyRelationJoinRowBatch = function () {
  var batch = Object.create(null);
  var notUnique = Object.create(null);

  for (var n = 0, ln = this.graph.nodes.length; n < ln; ++n) {
    var node = this.graph.nodes[n];

    for (var m = 0, lm = node.manyToManyConnections.length; m < lm; ++m) {
      var conn = node.manyToManyConnections[m];
      var tableInsertion = getTableInsertion(batch, conn.relation.joinTable);

      var sourceVal = node.model[conn.relation.ownerProp];
      var targetVal = conn.node.model[conn.relation.relatedProp];

      var uniqueKey;
      
      if (conn.relation.joinTableOwnerCol < conn.relation.joinTableRelatedCol) {
        uniqueKey = conn.relation.joinTable + '_' + sourceVal + '_' + targetVal;
      } else {
        uniqueKey = conn.relation.joinTable + '_' + targetVal + '_' + sourceVal;
      }

      if (notUnique[uniqueKey]) {
        continue;
      }

      var joinRow = {};

      notUnique[uniqueKey] = true;
      joinRow[conn.relation.joinTableOwnerCol] = sourceVal;
      joinRow[conn.relation.joinTableRelatedCol] = targetVal;

      if (!tableInsertion) {
        tableInsertion = new TableInsertion(null, conn.relation.joinTable);
        setTableInsertion(batch, conn.relation.joinTable, tableInsertion)
      }

      tableInsertion.models.push(joinRow);
      tableInsertion.isInputModel.push(false);
    }
  }

  return batch;
};

function TableInsertion(modelClass, tableName) {
  this.modelClass = modelClass;
  this.tableName = tableName;
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
  var self = this;

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

  var node = new DependencyNode(model, modelClass);

  this.nodesById[node.id] = node;
  this.nodes.push(node);

  if (!parentNode) {
    this.inputNodesById[node.id] = node;
  }

  if (rel instanceof OneToManyRelation) {

    node.needs.push(new Dependency(parentNode, function (model) {
      model[rel.relatedProp] = this.node.model[rel.ownerProp];
    }));

    parentNode.isNeededBy.push(new Dependency(node, function (model) {
      this.node.model[rel.relatedProp] = model[rel.ownerProp];
    }));

  } else if (rel instanceof OneToOneRelation) {

    node.isNeededBy.push(new Dependency(parentNode, function (model) {
      this.node.model[rel.ownerProp] = model[rel.relatedProp];
    }));

    parentNode.needs.push(new Dependency(node, function (model) {
      model[rel.ownerProp] = this.node.model[rel.relatedProp];
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
  var relations = modelClass.getRelations();

  for (var relName in relations) {
    var rel = getRelation(relations, relName);
    var relModels = getRelated(model, relName);
    var nextAllowed = null;

    if (relModels && allowedRelations instanceof RelationExpression) {
      nextAllowed = allowedRelations.childExpression(relName);

      if (!nextAllowed) {
        throw new ValidationError({allowedRelations: 'trying to insert an unallowed relation'});
      }
    }

    if (_.isArray(relModels)) {
      for (var i = 0, l = relModels.length; i < l; ++i) {
        this.buildForModel(rel.relatedModelClass, relModels[i], node, rel, nextAllowed);
      }
    } else if (relModels) {
      this.buildForModel(rel.relatedModelClass, relModels, node, rel, nextAllowed);
    }
  }
};

DependencyGraph.prototype.solveReferences = function () {
  var refMap = Object.create(null);

  // First merge all reference nodes into the actual node.
  this.mergeReferences(refMap);

  // Replace all reference nodes with the actual nodes.
  this.replaceReferenceNodes(refMap);
};

DependencyGraph.prototype.mergeReferences = function (refMap) {
  for (var n = 0, ln = this.nodes.length; n < ln; ++n) {
    var refNode = this.nodes[n];

    if (refNode.handled) {
      continue;
    }

    var ref = getUidRef(refNode.model);

    if (ref) {
      var actualNode = getNode(this.nodesById, ref);

      if (!actualNode) {
        throw new ValidationError({ref: 'could not resolve reference "' + ref + '"'});
      }

      var d, ld;

      for (d = 0, ld = refNode.needs.length; d < ld; ++d) {
        actualNode.needs.push(refNode.needs[d]);
      }

      for (d = 0, ld = refNode.isNeededBy.length; d < ld; ++d) {
        actualNode.isNeededBy.push(refNode.isNeededBy[d]);
      }

      for (var m = 0, lm = refNode.manyToManyConnections.length; m < lm; ++m) {
        actualNode.manyToManyConnections.push(refNode.manyToManyConnections[m]);
      }

      setRefMap(refMap, refNode.id, actualNode);

      refNode.handled = true;
    }
  }
};

DependencyGraph.prototype.replaceReferenceNodes = function (refMap) {
  for (var n = 0, ln = this.nodes.length; n < ln; ++n) {
    var node = this.nodes[n];
    var d, ld, dep, actualNode;

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

    for (var m = 0, lm = node.manyToManyConnections.length; m < lm; ++m) {
      var conn = node.manyToManyConnections[m];
      actualNode = getRefMap(refMap, conn.node.id);

      if (actualNode) {
        conn.node = actualNode;
      }
    }
  }
};

DependencyGraph.prototype.createNonRelationDeps = function () {
  for (var n = 0, ln = this.nodes.length; n < ln; ++n) {
    var node = this.nodes[n];

    if (!node.handled) {
      this.createNonRelationDepsForObject(node.model, node, []);
    }
  }
};

DependencyGraph.prototype.createNonRelationDepsForObject = function (obj, node, path) {
  var propRefRegex = node.modelClass.propRefRegex;
  var relations = node.modelClass.getRelations();
  var self = this;

  _.each(obj, function (value, key) {
    if (obj instanceof Model && getRelation(relations, key)) {
      // Don't traverse the relations of model instances.
      return;
    }

    path.push(key);

    if (_.isString(value)) {
      allMatches(propRefRegex, value, function (matchResult) {
        var match = matchResult[0];
        var refId = matchResult[1];
        var refProp = matchResult[2];
        var pathClone = path.slice();
        var refNode = self.nodesById[refId];

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
  var isCyclic = false;

  for (var n = 0, ln = nodes.length; n < ln; ++n) {
    var node = nodes[n];

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

    for (var d = 0, ld = node.needs.length; d < ld; ++d) {
      var dep = node.needs[d];

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
  for (var n = 0, ln = nodes.length; n < ln; ++n) {
    var node = nodes[n];

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
  var matchResult = regex.exec(str);

  while (matchResult) {
    cb(matchResult);
    matchResult = regex.exec(str);
  }
}

module.exports = InsertWithRelated;
