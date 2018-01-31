const ManyToManyUnrelateOperationBase = require('./ManyToManyUnrelateOperationBase');
const ManyToManyMySqlModifyMixin = require('../ManyToManyMySqlModifyMixin');

class ManyToManyUnrelateMySqlOperation extends ManyToManyMySqlModifyMixin(
  ManyToManyUnrelateOperationBase
) {
  get modifyMainQuery() {
    return false;
  }
}

module.exports = ManyToManyUnrelateMySqlOperation;
