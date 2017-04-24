'use strict';

class TableInsertion {

  constructor(modelClass, isJoinTableInsertion) {
    this.modelClass = modelClass;
    this.isJoinTableInsertion = isJoinTableInsertion;
    this.models = [];
    this.isInputModel = [];
  }
}

module.exports = TableInsertion;