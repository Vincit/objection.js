const ManyToManyDeleteOperationBase = require('./ManyToManyDeleteOperationBase');
const ManyToManyMySqlModifyMixin = require('../ManyToManyMySqlModifyMixin');

class ManyToManyDeleteMySqlOperation extends ManyToManyMySqlModifyMixin(
  ManyToManyDeleteOperationBase
) {}

module.exports = ManyToManyDeleteMySqlOperation;
