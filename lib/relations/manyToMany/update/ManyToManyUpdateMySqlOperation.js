'use strict';

const { ManyToManyUpdateOperationBase } = require('./ManyToManyUpdateOperationBase');
const { ManyToManyMySqlModifyMixin } = require('../ManyToManyMySqlModifyMixin');

const LimitSelector = /^(orderBy\w*|limit|offset)$/;

class ManyToManyUpdateMySqlOperation extends ManyToManyMySqlModifyMixin(
  ManyToManyUpdateOperationBase,
) {
  // MySQL is the only database that supports a limit in updates. Updates that
  // modify the join rows too update the related rows by their ids, so the limit
  // and the order pick these ids instead of limiting each batch of them. Without
  // a limit or an offset, the order picks nothing and the query stays as it is.
  onBuild(builder) {
    super.onBuild(builder);

    if (this.relatedIdsQuery && builder.has(/^(limit|offset)$/)) {
      this.relatedIdsQuery.copyFrom(builder, LimitSelector);
      builder.clear(LimitSelector);
    }
  }
}

module.exports = {
  ManyToManyUpdateMySqlOperation,
};
