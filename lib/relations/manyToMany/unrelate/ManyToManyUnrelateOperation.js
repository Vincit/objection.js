const ManyToManyUnrelateOperationBase = require('./ManyToManyUnrelateOperationBase');
const ManyToManyModifyMixin = require('../ManyToManyModifyMixin');

class ManyToManyUnrelateOperation extends ManyToManyModifyMixin(ManyToManyUnrelateOperationBase) {}

module.exports = ManyToManyUnrelateOperation;
