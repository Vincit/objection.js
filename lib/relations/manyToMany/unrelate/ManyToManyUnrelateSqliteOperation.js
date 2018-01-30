const ManyToManyUnrelateOperationBase = require('./ManyToManyUnrelateOperationBase');
const ManyToManySqliteModifyMixin = require('../ManyToManySqliteModifyMixin');

class ManyToManyUnrelateSqliteOperation extends ManyToManySqliteModifyMixin(
  ManyToManyUnrelateOperationBase
) {}

module.exports = ManyToManyUnrelateSqliteOperation;
