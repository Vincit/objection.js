const ManyToManyUnrelateOperationBase = require('./ManyToManyUnrelateOperationBase');
const ManyToManyMySqlModifyMixin = require('../ManyToManyMySqlModifyMixin');

class ManyToManyUnrelateMySqlOperation extends ManyToManyMySqlModifyMixin(
  ManyToManyUnrelateOperationBase
) {}

module.exports = ManyToManyUnrelateMySqlOperation;
