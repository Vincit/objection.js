const ManyToManyUpdateOperationBase = require('./ManyToManyUpdateOperationBase');
const ManyToManyModifyMixin = require('../ManyToManyModifyMixin');

class ManyToManyUpdateOperation extends ManyToManyModifyMixin(ManyToManyUpdateOperationBase) {}

module.exports = ManyToManyUpdateOperation;
