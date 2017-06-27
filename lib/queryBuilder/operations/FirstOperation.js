'use strict';

const QueryBuilderOperation = require('./QueryBuilderOperation');

class FirstOperation extends QueryBuilderOperation {

  onAfter3(builder, result) {
    if (Array.isArray(result)) {
      return result[0];
    } else {
      return result;
    }
  }
}

module.exports = FirstOperation;
