'use strict';

const { isObject, isString, asArray, asSingle } = require('../../utils/objectUtils');
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
      } else {
        this._buildNode(rootModelClass, roots);
      }
    }

    this._buildReferences();
  }

  _buildNodes(modelClass, objs, parentNode = null, relation = null) {
    asArray(objs).forEach((obj, index) => {
      this._buildNode(modelClass, obj, parentNode, relation, index);
    });
  }

  _buildNode(modelClass, obj, parentNode = null, relation = null, index = null) {
    const node = new ModelGraphNode(modelClass, asSingle(obj));
    this.nodes.push(node);

    if (parentNode) {
      const edge = new ModelGraphEdge(
        ModelGraphEdge.Type.Relation,
        parentNode,
        node,
        relation,
        index
      );

      node.parentEdge = edge;
      this._addEdge(parentNode, node, edge);
    }

    this._buildRelationNodes(node);
  }

  _buildRelationNodes(node) {
    for (const relation of node.modelClass.getRelationArray()) {
      const relatedObjects = node.obj[relation.name];

      if (!relatedObjects) {
        continue;
      }

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
        throw createReferenceFoundError(node, ref);
      }

      const edge = new ModelGraphEdge(ModelGraphEdge.Type.Reference, node, refNode);
      edge.refType = ModelGraphEdge.ReferenceType.Object;

      this._addEdge(node, refNode, edge);
    }
  }

  _buildPropertyReferences(nodesByUid) {
    for (const node of this.nodes) {
      const relations = node.modelClass.getRelations();

      for (const prop of Object.keys(node.obj)) {
        if (relations[prop]) {
          continue;
        }

        this._buildPropertyReference(nodesByUid, node, prop);
      }
    }
  }

  _buildPropertyReference(nodesByUid, node, prop) {
    visitStrings(node.obj[prop], [prop], (str, path) => {
      forEachMatch(node.modelClass.propRefRegex, str, match => {
        const [_, ref, refPath] = match;
        const refNode = nodesByUid.get(ref);

        if (!refNode) {
          throw createReferenceFoundError(node, ref);
        }

        const edge = new ModelGraphEdge(ModelGraphEdge.Type.Reference, node, refNode);

        edge.refType = ModelGraphEdge.ReferenceType.Property;
        edge.refMatch = match[0];
        edge.refOwnerDataPath = path.slice();
        edge.refRelatedDataPath = refPath.split('.');

        this._addEdge(node, refNode, edge);
      });
    });
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

function visitStrings(value, path, visit) {
  if (Array.isArray(value)) {
    visitStringsInArray(value, path, visit);
  } else if (isObject(value)) {
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

function createReferenceFoundError(node, ref) {
  return new Error('no reference found');
}

module.exports = {
  ModelGraphBuilder
};
