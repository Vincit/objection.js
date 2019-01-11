'use strict';

const { ManyToManyUpdateOperationBase } = require('./ManyToManyUpdateOperationBase');
const { ManyToManyMySqlModifyMixin } = require('../ManyToManyMySqlModifyMixin');

class ManyToManyUpdateMySqlOperation extends ManyToManyMySqlModifyMixin(
  ManyToManyUpdateOperationBase
) {}

module.exports = {
  ManyToManyUpdateMySqlOperation
};
