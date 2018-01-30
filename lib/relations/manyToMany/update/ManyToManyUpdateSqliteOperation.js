const ManyToManyUpdateOperationBase = require('./ManyToManyUpdateOperationBase');
const ManyToManySqliteModifyMixin = require('../ManyToManySqliteModifyMixin');

class ManyToManyUpdateSqliteOperation extends ManyToManySqliteModifyMixin(
  ManyToManyUpdateOperationBase
) {}

module.exports = ManyToManyUpdateSqliteOperation;
