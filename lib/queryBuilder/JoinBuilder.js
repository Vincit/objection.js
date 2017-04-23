'use strict';

const decorate = require('../utils/decorators/decorate');
const queryBuilderOperation = require('./decorators/queryBuilderOperation');
const QueryBuilderOperationSupport = require('./QueryBuilderOperationSupport');
const KnexOperation = require('./operations/KnexOperation');

class JoinBuilder extends QueryBuilderOperationSupport {

  /**
   * @returns {JoinBuilder}
   */
  using() {}

  /**
   * @returns {JoinBuilder}
   */
  on() {}

  /**
   * @returns {JoinBuilder}
   */
  orOn() {}

  /**
   * @returns {JoinBuilder}
   */
  onBetween() {}

  /**
   * @returns {JoinBuilder}
   */
  onNotBetween() {}

  /**
   * @returns {JoinBuilder}
   */
  orOnBetween() {}

  /**
   * @returns {JoinBuilder}
   */
  orOnNotBetween() {}

  /**
   * @returns {JoinBuilder}
   */
  onIn() {}

  /**
   * @returns {JoinBuilder}
   */
  onNotIn() {}

  /**
   * @returns {JoinBuilder}
   */
  orOnIn() {}

  /**
   * @returns {JoinBuilder}
   */
  orOnNotIn() {}

  /**
   * @returns {JoinBuilder}
   */
  onNull() {}

  /**
   * @returns {JoinBuilder}
   */
  orOnNull() {}

  /**
   * @returns {JoinBuilder}
   */
  onNotNull() {}

  /**
   * @returns {JoinBuilder}
   */
  orOnNotNull() {}

  /**
   * @returns {JoinBuilder}
   */
  onExists() {}

  /**
   * @returns {JoinBuilder}
   */
  orOnExists() {}

  /**
   * @returns {JoinBuilder}
   */
  onNotExists() {}

  /**
   * @returns {JoinBuilder}
   */
  orOnNotExists() {}

  /**
   * @returns {JoinBuilder}
   */
  type() {}

  /**
   * @returns {JoinBuilder}
   */
  or() {}

  /**
   * @returns {JoinBuilder}
   */
  andOn() {}

  /**
   * @returns {JoinBuilder}
   */
  andOnIn() {}

  /**
   * @returns {JoinBuilder}
   */
  andOnNotIn() {}

  /**
   * @returns {JoinBuilder}
   */
  andOnNull() {}

  /**
   * @returns {JoinBuilder}
   */
  andOnNotNull() {}

  /**
   * @returns {JoinBuilder}
   */
  andOnExists() {}

  /**
   * @returns {JoinBuilder}
   */
  andOnNotExists() {}

  /**
   * @returns {JoinBuilder}
   */
  andOnBetween() {}

  /**
   * @returns {JoinBuilder}
   */
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
