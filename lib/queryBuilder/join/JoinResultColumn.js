'use strict';

class JoinResultColumn {
  constructor({ columnAlias, tableNode, name }) {
    this.columnAlias = columnAlias;
    this.tableNode = tableNode;
    this.name = name;
  }

  static create({ tableTree, columnAlias }) {
    const tableNode = tableTree.getNodeForColumnAlias(columnAlias);

    return new JoinResultColumn({
      columnAlias,
      tableNode,
      name: tableNode.getColumnForColumnAlias(columnAlias)
    });
  }
}

module.exports = {
  JoinResultColumn
};
