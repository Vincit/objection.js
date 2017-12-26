class TableInsertion {
  constructor(modelClass, isJoinTableInsertion) {
    this.modelClass = modelClass;
    this.isJoinTableInsertion = isJoinTableInsertion;
    this.items = [];
  }
}

module.exports = TableInsertion;
