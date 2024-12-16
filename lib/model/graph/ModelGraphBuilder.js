'use strict';

const { isObject, isString, asArray, asSingle } = require('../../utils/objectUtils');
const { ValidationErrorType } = require('../../model/ValidationError');
const { ModelGraphNode } = require('./ModelGraphNode');
const { ModelGraphEdge } = require('./ModelGraphEdge');

class ModelGraphBuilder {
  constructor() {
    this.nodes = [];
    this.edges = [];
  }

  static buildGraph(rootModelClass, roots) {
    const builder = new this();
    builder._buildGraph(rootModelClass, roots);

    return builder;
  }

  _buildGraph(rootModelClass, roots) {
    if (roots) {
      if (Array.isArray(roots)) {
        this._buildNodes(rootModelClass, roots);
      } else if (isObject(roots)) {
        this._buildNode(rootModelClass, roots);
      } else {
        throw createNotModelError(rootModelClass, roots);
      }
    }

    this._buildReferences();
  }

  _buildNodes(modelClass, objs, parentNode = null, relation = null) {
    objs = asArray(objs);

    objs.forEach((obj, index) => {
      this._buildNode(modelClass, obj, parentNode, relation, index);
    });
  }

  _buildNode(modelClass, obj, parentNode = null, relation = null, index = null) {
    obj = asSingle(obj);

    if (!isObject(obj) || !obj.$isObjectionModel) {
      throw createNotModelError(modelClass, obj);
    }

    const node = new ModelGraphNode(modelClass, obj);
    this.nodes.push(node);

    if (parentNode) {
      const edge = new ModelGraphEdge(
        ModelGraphEdge.Type.Relation,
        parentNode,
        node,
        relation,
        index,
      );

      node.parentEdge = edge;
      this._addEdge(parentNode, node, edge);
    }

    this._buildRelationNodes(node);
  }

  _buildRelationNodes(node) {
    for (const relationName of node.modelClass.getRelationNames()) {
      const relatedObjects = node.obj[relationName];

      if (!relatedObjects) {
        continue;
      }

      const relation = node.modelClass.getRelation(relationName);

      if (relation.isOneToOne()) {
        this._buildNode(relation.relatedModelClass, relatedObjects, node, relation);
      } else {
        this._buildNodes(relation.relatedModelClass, relatedObjects, node, relation);
      }
    }
  }

  _buildReferences() {
    const nodesByUid = this._nodesByUid();

    this._buildObjectReferences(nodesByUid);
    this._buildPropertyReferences(nodesByUid);
  }

  _nodesByUid() {
    const nodesByUid = new Map();

    for (const node of this.nodes) {
      const uid = node.uid;

      if (uid === undefined) {
        continue;
      }

      nodesByUid.set(uid, node);
    }

    return nodesByUid;
  }

  _buildObjectReferences(nodesByUid) {
    for (const node of this.nodes) {
      const ref = node.reference;

      if (ref === undefined) {
        continue;
      }

      const refNode = nodesByUid.get(ref);

      if (!refNode) {
        throw createReferenceNotFoundError(ref);
      }

      const edge = new ModelGraphEdge(ModelGraphEdge.Type.Reference, node, refNode);
      edge.refType = ModelGraphEdge.ReferenceType.Object;

      this._addEdge(node, refNode, edge);
    }
  }

  _buildPropertyReferences(nodesByUid) {
    for (const node of this.nodes) {
      forEachPropertyReference(node.obj, ({ path, refMatch, ref, refPath }) => {
        const refNode = nodesByUid.get(ref);

        if (!refNode) {
          throw createReferenceNotFoundError(ref);
        }

        const edge = new ModelGraphEdge(ModelGraphEdge.Type.Reference, node, refNode);

        edge.refType = ModelGraphEdge.ReferenceType.Property;
        edge.refMatch = refMatch;
        edge.refOwnerDataPath = path.slice();
        edge.refRelatedDataPath = refPath;

        this._addEdge(node, refNode, edge);
      });
    }
  }

  _addEdge(ownerNode, relatedNode, edge) {
    this.edges.push(edge);

    ownerNode.edges.push(edge);
    relatedNode.edges.push(edge);

    if (edge.type === ModelGraphEdge.Type.Reference) {
      ownerNode.refEdges.push(edge);
      relatedNode.refEdges.push(edge);
    }
  }
}

function forEachPropertyReference(obj, callback) {
  const modelClass = obj.constructor;
  const relationNames = modelClass.getRelationNames();

  for (const prop of Object.keys(obj)) {
    if (relationNames.includes(prop)) {
      continue;
    }

    visitStrings(obj[prop], [prop], (str, path) => {
      forEachMatch(modelClass.propRefRegex, str, (match) => {
        const [refMatch, ref, refPath] = match;
        callback({ path, refMatch, ref, refPath: refPath.trim().split('.') });
      });
    });
  }
}

function visitStrings(value, path, visit) {
  if (Array.isArray(value)) {
    visitStringsInArray(value, path, visit);
  } else if (isObject(value) && !Buffer.isBuffer(value)) {
    visitStringsInObject(value, path, visit);
  } else if (isString(value)) {
    visit(value, path);
  }
}

function visitStringsInArray(value, path, visit) {
  for (let i = 0; i < value.length; ++i) {
    path.push(i);
    visitStrings(value[i], path, visit);
    path.pop();
  }
}

function visitStringsInObject(value, path, visit) {
  for (const prop of Object.keys(value)) {
    path.push(prop);
    visitStrings(value[prop], path, visit);
    path.pop();
  }
}

function forEachMatch(regex, str, cb) {
  let matchResult = regex.exec(str);

  while (matchResult) {
    cb(matchResult);
    matchResult = regex.exec(str);
  }
}

function createReferenceNotFoundError(ref) {
  return new Error(
    [
      `could not resolve reference ${ref} in a graph.`,
      `If you are sure the #id exist in the same graph,`,
      `this may be due to a limitation that a subgraph under a related item`,
      `cannot reference an item in a subgraph under another related item.`,
      `If you run into this limitation, please open an issue in objection github.`,
    ].join(' '),
  );
}

function createNotModelError(modelClass, value) {
  throw modelClass.createValidationError({
    type: ValidationErrorType.InvalidGraph,
    message: `expected value "${value}" to be an instance of ${modelClass.name}`,
  });
}

module.exports = {
  ModelGraphBuilder,
  createNotModelError,
  forEachPropertyReference,
};
