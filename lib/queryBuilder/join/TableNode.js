'use strict';

class TableNode {
  constructor({ tableTree, modelClass, expression, parentNode = null, relation = null }) {
    this.tableTree = tableTree;
    this.modelClass = modelClass;
    this.parentNode = parentNode;
    this.relation = relation;
    this.expression = expression;
    this.childNodes = [];

    this.alias = this._calculateAlias();
    this.idGetter = this._createIdGetter();
  }

  static create(args) {
    const node = new TableNode(args);

    if (node.parentNode) {
      node.parentNode.childNodes.push(node);
    }

    return node;
  }

  get options() {
    return this.tableTree.options;
  }

  get relationProperty() {
    return this.expression.node.$name;
  }

  get joinTableAlias() {
    return this.modelClass.joinTableAlias(this.alias);
  }

  getReferenceForColumn(column) {
    return `${this.alias}.${column}`;
  }

  getColumnAliasForColumn(column) {
    if (this.parentNode) {
      return `${this.alias}${this.options.separator}${column}`;
    } else {
      return column;
    }
  }

  getColumnForColumnAlias(columnAlias) {
    const lastSepIndex = columnAlias.lastIndexOf(this.options.separator);

    if (lastSepIndex === -1) {
      return columnAlias;
    } else {
      return columnAlias.slice(lastSepIndex + this.options.separator.length);
    }
  }

  getIdFromFlatRow(flatRow) {
    return this.idGetter(flatRow);
  }

  _calculateAlias() {
    if (this.parentNode) {
      const relationName = this.expression.node.$name;
      const alias = this.options.aliases[relationName] || relationName;

      if (this.options.minimize) {
        return `_t${this.tableTree.createNextUid()}`;
      } else if (this.parentNode.parentNode) {
        return `${this.parentNode.alias}${this.options.separator}${alias}`;
      } else {
        return alias;
      }
    } else {
      return this.tableTree.rootTableAlias;
    }
  }

  _createIdGetter() {
    const idColumns = this.modelClass.getIdColumnArray();
    const columnAliases = idColumns.map(column => this.getColumnAliasForColumn(column));

    if (idColumns.length === 1) {
      return createIdGetter(columnAliases);
    } else {
      return createCompositeIdGetter(columnAliases);
    }
  }
}

function createIdGetter(columnAliases) {
  const columnAlias = columnAliases[0];

  return flatRow => {
    const id = flatRow[columnAlias];

    if (id === null) {
      return null;
    }

    return `${id}`;
  };
}

function createCompositeIdGetter(columnAliases) {
  if (columnAliases.length === 2) {
    return createTwoIdGetter(columnAliases);
  } else {
    return createMultiIdGetter(columnAliases);
  }
}

function createTwoIdGetter(columnAliases) {
  const columnAlias1 = columnAliases[0];
  const columnAlias2 = columnAliases[1];

  return flatRow => {
    const id1 = flatRow[columnAlias1];
    const id2 = flatRow[columnAlias2];

    if (id1 === null || id2 === null) {
      return null;
    }

    return `${id1},${id2}`;
  };
}

function createMultiIdGetter(columnAliases) {
  return flatRow => {
    let idStr = '';

    for (let i = 0, l = columnAliases.length; i < l; ++i) {
      const columnAlias = columnAliases[i];
      const id = flatRow[columnAlias];

      if (id === null) {
        return null;
      }

      idStr += id;

      if (i !== l - 1) {
        idStr += ',';
      }
    }

    return idStr;
  };
}

module.exports = {
  TableNode
};
