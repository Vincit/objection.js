'use strict';

const { ModelGraphEdge } = require('./ModelGraphEdge');
const { isNumber } = require('../../utils/objectUtils');
const NOT_CALCULATED = {};

class ModelGraphNode {
  constructor(modelClass, obj) {
    this.modelClass = modelClass;
    this.obj = obj;
    this.edges = [];
    this.userData = {};
    this.hadIdOriginally = obj.$hasId();

    // These are also included in `edges`. These are simply
    // shortcuts for commonly used edges.
    this.refEdges = [];
    this.parentEdge = null;

    // These are calculated lazily.
    this._relationPath = NOT_CALCULATED;
    this._relationPathKey = NOT_CALCULATED;

    this._dataPath = NOT_CALCULATED;
    this._dataPathKey = NOT_CALCULATED;

    this._idPath = NOT_CALCULATED;
    this._idPathKey = NOT_CALCULATED;
  }

  get isReference() {
    return this.reference !== undefined;
  }

  get isDbReference() {
    return this.dbReference !== undefined;
  }

  get reference() {
    return this.obj[this.modelClass.uidRefProp];
  }

  get dbReference() {
    return this.obj[this.modelClass.dbRefProp];
  }

  get uid() {
    return this.obj[this.modelClass.uidProp];
  }

  get parentNode() {
    if (this.parentEdge) {
      return this.parentEdge.ownerNode;
    } else {
      return null;
    }
  }

  get indexInRelation() {
    if (this.parentEdge) {
      return this.parentEdge.relationIndex;
    } else {
      return null;
    }
  }

  get relationName() {
    if (this.parentEdge) {
      return this.parentEdge.relation.name;
    } else {
      return null;
    }
  }

  get relationPath() {
    if (this._relationPath === NOT_CALCULATED) {
      this._relationPath = this._createRelationPath();
    }

    return this._relationPath;
  }

  get relationPathKey() {
    if (this._relationPathKey === NOT_CALCULATED) {
      this._relationPathKey = this._createRelationPathKey();
    }

    return this._relationPathKey;
  }

  get dataPath() {
    if (this._dataPath === NOT_CALCULATED) {
      this._dataPath = this._createDataPath();
    }

    return this._dataPath;
  }

  get dataPathKey() {
    if (this._dataPathKey === NOT_CALCULATED) {
      this._dataPathKey = this._createDataPathKey();
    }

    return this._dataPathKey;
  }

  get idPath() {
    if (this._idPath === NOT_CALCULATED) {
      this._idPath = this._createIdPath();
    }

    return this._idPath;
  }

  get idPathKey() {
    if (this._idPathKey === NOT_CALCULATED) {
      this._idPathKey = this._createIdPathKey();
    }

    return this._idPathKey;
  }

  /**
   * If this node is a reference, returns the referred node.
   */
  get referencedNode() {
    for (const edge of this.refEdges) {
      if (edge.refType === ModelGraphEdge.ReferenceType.Object && edge.isOwnerNode(this)) {
        return edge.relatedNode;
      }
    }

    return null;
  }

  /**
   * Returns all nodes that are references to this node.
   */
  get referencingNodes() {
    const nodes = [];

    for (const edge of this.refEdges) {
      if (edge.refType === ModelGraphEdge.ReferenceType.Object && edge.isRelatedNode(this)) {
        nodes.push(edge.ownerNode);
      }
    }

    return nodes;
  }

  get descendantRelationNodes() {
    return this._collectDescendantRelationNodes([]);
  }

  removeEdge(edge) {
    // Don't allow removing parent edges for now. It would
    // cause all kinds of cache invalidation.
    if (edge === this.parentEdge) {
      throw new Error('cannot remove parent edge');
    }

    this.edges = this.edges.filter(it => it !== edge);
    this.refEdges = this.refEdges.filter(it => it !== edge);
  }

  _collectDescendantRelationNodes(nodes) {
    for (const edge of this.edges) {
      if (edge.type === ModelGraphEdge.Type.Relation && edge.isOwnerNode(this)) {
        nodes.push(edge.relatedNode);
        edge.relatedNode._collectDescendantRelationNodes(nodes);
      }
    }

    return nodes;
  }

  _createRelationPath() {
    if (this.parentNode === null) {
      return [];
    } else {
      return [...this.parentNode.relationPath, this.relationName];
    }
  }

  _createRelationPathKey() {
    return this.relationPath.join('.');
  }

  _createDataPath() {
    if (this.parentEdge === null) {
      return [];
    } else if (this.parentEdge.relation.isOneToOne()) {
      return [...this.parentNode.dataPath, this.relationName];
    } else {
      return [...this.parentNode.dataPath, this.relationName, this.indexInRelation];
    }
  }

  _createDataPathKey() {
    const dataPathKey = this.dataPath.reduce((key, it) => {
      if (isNumber(it)) {
        return `${key}[${it}]`;
      } else {
        return key ? `${key}.${it}` : it;
      }
    }, '');

    return dataPathKey ? '.' + dataPathKey : dataPathKey;
  }

  _createIdPath() {
    if (!this.obj.$hasId()) {
      return null;
    }

    if (this.parentEdge === null) {
      return [this.obj.$idKey()];
    } else {
      const path = this.parentNode.idPath;

      if (path === null) {
        return null;
      }

      return [...path, this.relationName, this.obj.$idKey()];
    }
  }

  _createIdPathKey() {
    const idPath = this.idPath;

    if (idPath) {
      return this.idPath.join('.');
    } else {
      return null;
    }
  }
}

module.exports = {
  ModelGraphNode
};
