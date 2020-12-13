'use strict';

const { WhereInEagerOperation } = require('./WhereInEagerOperation');

class NaiveEagerOperation extends WhereInEagerOperation {
  batchSize() {
    return 1;
  }
}

module.exports = {
  NaiveEagerOperation,
};
