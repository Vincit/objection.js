const { appendDataPath } = require('../../utils/dataPath');
const { Type: ValidationErrorType } = require('../../model/ValidationError');
const { isObject, last, isString } = require('../../utils/objectUtils');

const HasManyRelation = require('../../relations/hasMany/HasManyRelation');
const ManyToManyRelation = require('../../relations/manyToMany/ManyToManyRelation');
const BelongsToOneRelation = require('../../relations/belongsToOne/BelongsToOneRelation');

const DependencyNode = require('./DependencyNode');
const HasManyDependency = require('./HasManyDependency');
const ManyToManyConnection = require('./ManyToManyConnection');
const ReplaceValueDependency = require('./ReplaceValueDependency');
const BelongsToOneDependency = require('./BelongsToOneDependency');
const InterpolateValueDependency = require('./InterpolateValueDependency');

class DependencyGraph {
  constructor(opt, allowedRelations) {
    this.allowedRelations = allowedRelations;
    this.nodesById = new Map();
    this.nodes = [];
    this.uid = 0;
    this.opt = opt || Object.create(null);
  }

  build(modelClass, models) {
    this.nodesById = new Map();
    this.nodes = [];

    if (Array.isArray(models)) {
      for (let i = 0, l = models.length; i < l; ++i) {
        this.buildForModel({
          modelClass,
          model: models[i],
          parentModel: null,
          allowedRelations: this.allowedRelations,
          dataPath: null,
          rel: null
        });
      }
    } else {
      this.buildForModel({
        modelClass,
        model: models,
        parentModel: null,
        allowedRelations: this.allowedRelations,
        dataPath: null,
        rel: null
      });
    }

    this.solveReferences();
    this.createNonRelationDeps();

    return this.nodes;
  }

  hasCyclicReferences() {
    return this.isCyclic(this.nodes);
  }

  buildForModel({ modelClass, model, parentNode, rel, allowedRelations, dataPath }) {
    if (!model || !model.$isObjectionModel) {
      throw modelClass.createValidationError({
        type: ValidationErrorType.InvalidGraph,
        message: 'not a model'
      });
    }

    if (!model[modelClass.uidProp]) {
      model[modelClass.uidProp] = this.createUid();
    }

    const node = new DependencyNode({ parentNode, model, modelClass, relation: rel, dataPath });
    const isRelate = this.isRelate({ modelClass, model, parentNode, rel });
    const dbRef = model[modelClass.dbRefProp];

    this.nodesById.set(node.id, node);
    this.nodes.push(node);

    if (isRelate && dbRef) {
      const isComposite = Array.isArray(dbRef);

      for (let i = 0; i < rel.relatedProp.size; ++i) {
        rel.relatedProp.setProp(model, i, isComposite ? dbRef[i] : dbRef);
      }
    }

    if (rel) {
      if (rel instanceof HasManyRelation) {
        node.needs.push(new HasManyDependency(parentNode, rel));
        parentNode.isNeededBy.push(new HasManyDependency(node, rel));

        if (isRelate) {
          throw new Error(
            `You cannot relate HasManyRelation or HasOneRelation using insertGraph, because those require update operations. Consider using upsertGraph instead.`
          );
        }
      } else if (rel instanceof BelongsToOneRelation) {
        node.isNeededBy.push(new BelongsToOneDependency(parentNode, rel));
        parentNode.needs.push(new BelongsToOneDependency(node, rel));

        if (isRelate) {
          // We can resolve the node immediately if we are relating since
          // `model` already has the foreign key.
          last(node.isNeededBy).resolve(model);
        }
      } else if (rel instanceof ManyToManyRelation) {
        // ManyToManyRelations create no dependencies since we can create the
        // join table rows after everything else has been inserted.
        parentNode.manyToManyConnections.push(new ManyToManyConnection(node, rel));
      }
    }

    if (isRelate) {
      // If the node is a relate node, it already exists in the database.
      // Mark it as inserted.
      node.markAsInserted();
    }

    this.buildForRelations({ modelClass, node, allowedRelations, dataPath });
  }

  buildForRelations({ modelClass, node, allowedRelations, dataPath }) {
    const model = node.model;
    const relations = modelClass.getRelationArray();

    for (let i = 0, l = relations.length; i < l; ++i) {
      const rel = relations[i];
      const relModels = model[rel.name];

      let nextAllowed = null;

      if (relModels) {
        if (isObject(allowedRelations) && allowedRelations.isObjectionRelationExpression) {
          nextAllowed = allowedRelations.childExpression(rel.name);

          if (!nextAllowed) {
            throw modelClass.createValidationError({
              type: ValidationErrorType.UnallowedRelation,
              message: 'trying to insert an unallowed relation'
            });
          }
        }

        const relPath = appendDataPath(dataPath, rel);

        if (Array.isArray(relModels)) {
          for (let i = 0, l = relModels.length; i < l; ++i) {
            this.buildForModel({
              modelClass: rel.relatedModelClass,
              model: relModels[i],
              parentNode: node,
              rel,
              allowedRelations: nextAllowed,
              dataPath: appendDataPath(relPath, i)
            });
          }
        } else {
          this.buildForModel({
            model: relModels,
            modelClass: rel.relatedModelClass,
            parentNode: node,
            allowedRelations: nextAllowed,
            dataPath: relPath,
            rel
          });
        }
      }
    }
  }

  isRelate({ modelClass, model, parentNode, rel }) {
    if (!rel) {
      return false;
    }

    if (model[modelClass.dbRefProp]) {
      return true;
    }

    return rel.hasRelateProp(model) && this.hasOption('relate', relationPath(parentNode, rel));
  }

  hasOption(option, relationPath) {
    const opt = this.opt[option];

    if (Array.isArray(opt)) {
      return opt.indexOf(relationPath) !== -1;
    } else {
      return !!opt;
    }
  }

  solveReferences() {
    const refMap = new Map();

    // First merge all reference nodes into the actual node.
    this.mergeReferences(refMap);

    // Replace all reference nodes with the actual nodes.
    this.replaceReferenceNodes(refMap);
  }

  mergeReferences(refMap) {
    for (let n = 0, ln = this.nodes.length; n < ln; ++n) {
      const refNode = this.nodes[n];
      let ref;

      if (refNode.handled) {
        continue;
      }

      ref = refNode.model[refNode.modelClass.uidRefProp];

      if (ref) {
        const actualNode = this.nodesById.get(ref);

        if (!actualNode) {
          throw refNode.modelClass.createValidationError({
            type: ValidationErrorType.InvalidGraph,
            message: `could not resolve reference "${ref}"`
          });
        }

        for (let d = 0, ld = refNode.needs.length; d < ld; ++d) {
          actualNode.needs.push(refNode.needs[d]);
        }

        for (let d = 0, ld = refNode.isNeededBy.length; d < ld; ++d) {
          actualNode.isNeededBy.push(refNode.isNeededBy[d]);
        }

        for (let m = 0, lm = refNode.manyToManyConnections.length; m < lm; ++m) {
          actualNode.manyToManyConnections.push(refNode.manyToManyConnections[m]);
        }

        refMap.set(refNode.id, actualNode);
        refNode.handled = true;
      }
    }
  }

  replaceReferenceNodes(refMap) {
    for (let n = 0, ln = this.nodes.length; n < ln; ++n) {
      const node = this.nodes[n];
      let d, ld, dep, actualNode;

      for (d = 0, ld = node.needs.length; d < ld; ++d) {
        dep = node.needs[d];
        actualNode = refMap.get(dep.node.id);

        if (actualNode) {
          dep.node = actualNode;
        }
      }

      for (d = 0, ld = node.isNeededBy.length; d < ld; ++d) {
        dep = node.isNeededBy[d];
        actualNode = refMap.get(dep.node.id);

        if (actualNode) {
          dep.node = actualNode;
        }
      }

      for (let m = 0, lm = node.manyToManyConnections.length; m < lm; ++m) {
        const conn = node.manyToManyConnections[m];
        actualNode = refMap.get(conn.node.id);

        if (actualNode) {
          conn.refNode = conn.node;
          conn.node = actualNode;
        }
      }
    }
  }

  createNonRelationDeps() {
    for (let n = 0, ln = this.nodes.length; n < ln; ++n) {
      const node = this.nodes[n];

      if (!node.handled) {
        this.createNonRelationDepsForObject(node.model, node, []);
      }
    }
  }

  createNonRelationDepsForObject(obj, node, path) {
    const propRefRegex = node.modelClass.propRefRegex;
    const relations = node.modelClass.getRelations();
    const isModel = obj && obj.$isObjectionModel;
    const keys = Object.keys(obj);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const value = obj[key];

      if (isModel && relations[key]) {
        // Don't traverse the relations of model instances.
        return;
      }

      path.push(key);

      if (isString(value)) {
        allMatches(propRefRegex, value, matchResult => {
          const [match, refId, refProp] = matchResult;
          const refNode = this.nodesById.get(refId);

          if (!refNode) {
            throw node.modelClass.createValidationError({
              type: ValidationErrorType.InvalidGraph,
              message: `could not resolve reference "${value}"`
            });
          }

          if (value === match) {
            // If the match is the whole string, replace the value with the resolved value.
            // This means that the value will have the same type as the resolved value
            // (date, number, etc).
            node.needs.push(new ReplaceValueDependency(refNode, path, refProp, false));
            refNode.isNeededBy.push(new ReplaceValueDependency(node, path, refProp, true));
          } else {
            // If the match is inside a string, replace the reference inside the string with
            // the resolved value.
            node.needs.push(new InterpolateValueDependency(refNode, path, refProp, match, false));
            refNode.isNeededBy.push(
              new InterpolateValueDependency(node, path, refProp, match, true)
            );
          }
        });
      } else if (isObject(value)) {
        this.createNonRelationDepsForObject(value, node, path);
      }

      path.pop();
    }
  }

  isCyclic(nodes) {
    let isCyclic = false;

    for (let n = 0, ln = nodes.length; n < ln; ++n) {
      let node = nodes[n];

      if (node.handled) {
        continue;
      }

      if (this.isCyclicNode(node)) {
        isCyclic = true;
        break;
      }
    }

    this.clearFlags(this.nodes);
    return isCyclic;
  }

  isCyclicNode(node) {
    if (!node.visited) {
      node.visited = true;
      node.recursion = true;

      for (let d = 0, ld = node.needs.length; d < ld; ++d) {
        let dep = node.needs[d];

        if (dep.node.handled) {
          continue;
        }

        if (!dep.node.visited && this.isCyclicNode(dep.node)) {
          return true;
        } else if (dep.node.recursion) {
          return true;
        }
      }
    }

    node.recursion = false;
    return false;
  }

  clearFlags(nodes) {
    for (let n = 0, ln = nodes.length; n < ln; ++n) {
      let node = nodes[n];

      node.visited = false;
      node.recursion = false;
    }
  }

  createUid() {
    return `__objection_uid(${++this.uid})__`;
  }
}

function allMatches(regex, str, cb) {
  let matchResult = regex.exec(str);

  while (matchResult) {
    cb(matchResult);
    matchResult = regex.exec(str);
  }
}

function relationPath(parentNode, rel) {
  let path = '';

  while (parentNode !== null && parentNode.relation !== null) {
    path = parentNode.relation.name + (path ? '.' : '') + path;
    parentNode = parentNode.parentNode;
  }

  return path + (path ? '.' : '') + (rel ? rel.name : '');
}

module.exports = DependencyGraph;
