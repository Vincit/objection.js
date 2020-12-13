'use strict';

const Type = {
  Relation: 'Relation',
  Reference: 'Reference',
};

const ReferenceType = {
  Object: 'Object',
  Property: 'Property',
};

class ModelGraphEdge {
  constructor(type, ownerNode, relatedNode, relation = null, relationIndex = null) {
    this.type = type;

    this.ownerNode = ownerNode;
    this.relatedNode = relatedNode;
    this.relation = relation;
    this.relationIndex = relationIndex;

    this.refType = null;
    this.refMatch = null;

    this.refOwnerDataPath = null;
    this.refRelatedDataPath = null;
  }

  static get Type() {
    return Type;
  }

  static get ReferenceType() {
    return ReferenceType;
  }

  getOtherNode(node) {
    return this.isOwnerNode(node) ? this.relatedNode : this.ownerNode;
  }

  isOwnerNode(node) {
    return node === this.ownerNode;
  }

  isRelatedNode(node) {
    return node === this.relatedNode;
  }
}

module.exports = {
  ModelGraphEdge,
};
