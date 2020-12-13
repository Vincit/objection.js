'use strict';

const { ManyToManyUnrelateOperationBase } = require('./ManyToManyUnrelateOperationBase');
const { ManyToManyModifyMixin } = require('../ManyToManyModifyMixin');

class ManyToManyUnrelateOperation extends ManyToManyModifyMixin(ManyToManyUnrelateOperationBase) {
  get modifyMainQuery() {
    return false;
  }
}

module.exports = {
  ManyToManyUnrelateOperation,
};
