'use strict';

const { forEachChildExpression } = require('./utils');
const { TableNode } = require('./TableNode');

class TableTree {
  constructor({ expression, rootModelClass, rootTableAlias, options }) {
    this.options = options;
    this.rootModelClass = rootModelClass;
    this.rootTableAlias = rootTableAlias;
    this.nodes = [];
    this.nodesByAlias = new Map();
    this.uidCounter = 0;

    this._createNodes({ expression, modelClass: rootModelClass });
  }

  static create(args) {
    return new TableTree(args);
  }

  get rootNode() {
    return this.nodes[0];
  }

  getNodeForColumnAlias(columnAlias) {
    const lastSepIndex = columnAlias.lastIndexOf(this.options.separator);

    if (lastSepIndex === -1) {
      return this.rootNode;
    } else {
      const tableAlias = columnAlias.slice(0, lastSepIndex);
      return this.nodesByAlias.get(tableAlias);
    }
  }

  createNextUid() {
    return this.uidCounter++;
  }

  _createNodes({ expression, modelClass }) {
    const rootNode = this._createRootNode({ expression, modelClass });
    this._createChildNodes({ expression, modelClass, parentNode: rootNode });

    for (const node of this.nodes) {
      this.nodesByAlias.set(node.alias, node);
    }
  }

  _createRootNode({ expression, modelClass }) {
    const node = TableNode.create({
      tableTree: this,
      modelClass,
      expression
    });

    this.nodes.push(node);
    return node;
  }

  _createChildNodes({ expression, modelClass, parentNode }) {
    forEachChildExpression(expression, modelClass, (childExpr, relation) => {
      const node = TableNode.create({
        tableTree: this,
        modelClass: relation.relatedModelClass,
        expression: childExpr,

        parentNode,
        relation
      });

      this.nodes.push(node);

      this._createChildNodes({
        expression: childExpr,
        modelClass: relation.relatedModelClass,
        parentNode: node
      });
    });
  }
}

module.exports = {
  TableTree
};
