'use strict';

const decorate = require('../utils/decorators/decorate');
const queryBuilderOperation = require('./decorators/queryBuilderOperation');
const QueryBuilderOperationSupport = require('./QueryBuilderOperationSupport');
const KnexOperation = require('./operations/KnexOperation');

class JoinBuilder extends QueryBuilderOperationSupport {
  using() {}
  on() {}
  orOn() {}
  onBetween() {}
  onNotBetween() {}
  orOnBetween() {}
  orOnNotBetween() {}
  onIn() {}
  onNotIn() {}
  orOnIn() {}
  orOnNotIn() {}
  onNull() {}
  orOnNull() {}
  onNotNull() {}
  orOnNotNull() {}
  onExists() {}
  orOnExists() {}
  onNotExists() {}
  orOnNotExists() {}
  type() {}
  or() {}
  andOn() {}
  andOnIn() {}
  andOnNotIn() {}
  andOnNull() {}
  andOnNotNull() {}
  andOnExists() {}
  andOnNotExists() {}
  andOnBetween() {}
  andOnNotBetween() {}
}

/**
 * Until node gets decorators, we need to apply them like this.
 */
decorate(JoinBuilder.prototype, [{
  decorator: queryBuilderOperation(KnexOperation),
  properties: [
    'using',
    'on',
    'orOn',
    'onBetween',
    'onNotBetween',
    'orOnBetween',
    'orOnNotBetween',
    'onIn',
    'onNotIn',
    'orOnIn',
    'orOnNotIn',
    'onNull',
    'orOnNull',
    'onNotNull',
    'orOnNotNull',
    'onExists',
    'orOnExists',
    'onNotExists',
    'orOnNotExists',
    'type',
    'or',
    'andOn',
    'andOnIn',
    'andOnNotIn',
    'andOnNull',
    'andOnNotNull',
    'andOnExists',
    'andOnNotExists',
    'andOnBetween',
    'andOnNotBetween'
  ]
}]);

module.exports = JoinBuilder;
