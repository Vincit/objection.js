'use strict';

const { ManyToManyDeleteOperationBase } = require('./ManyToManyDeleteOperationBase');
const { ManyToManyModifyMixin } = require('../ManyToManyModifyMixin');

class ManyToManyDeleteOperation extends ManyToManyModifyMixin(ManyToManyDeleteOperationBase) {}

module.exports = {
  ManyToManyDeleteOperation
};
