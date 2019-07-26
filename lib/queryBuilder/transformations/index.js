'use strict';

const { CompositeQueryTransformation } = require('./CompositeQueryTransformation');

const {
  WrapMysqlModifySubqueryTransformation
} = require('./WrapMysqlModifySubqueryTransformation');

const transformation = new CompositeQueryTransformation([
  new WrapMysqlModifySubqueryTransformation()
]);

module.exports = {
  transformation
};
