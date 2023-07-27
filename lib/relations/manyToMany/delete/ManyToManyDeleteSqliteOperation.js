'use strict';

const { ManyToManyDeleteOperationBase } = require('./ManyToManyDeleteOperationBase');
const { ManyToManySqliteModifyMixin } = require('../ManyToManySqliteModifyMixin');

class ManyToManyDeleteSqliteOperation extends ManyToManySqliteModifyMixin(
  ManyToManyDeleteOperationBase,
) {}

module.exports = {
  ManyToManyDeleteSqliteOperation,
};
