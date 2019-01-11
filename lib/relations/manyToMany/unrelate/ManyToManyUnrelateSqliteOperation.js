'use strict';

const { ManyToManyUnrelateOperationBase } = require('./ManyToManyUnrelateOperationBase');
const { ManyToManySqliteModifyMixin } = require('../ManyToManySqliteModifyMixin');

class ManyToManyUnrelateSqliteOperation extends ManyToManySqliteModifyMixin(
  ManyToManyUnrelateOperationBase
) {
  get modifyMainQuery() {
    return false;
  }
}

module.exports = {
  ManyToManyUnrelateSqliteOperation
};
