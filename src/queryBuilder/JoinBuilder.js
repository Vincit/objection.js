const _ = require('lodash');
const QueryBuilderOperationSupport = require('./QueryBuilderOperationSupport');
const queryBuilderOperation = require('./decorators/queryBuilderOperation');
const {inherits} = require('../utils/classUtils');

const QueryBuilderContextBase = require('./QueryBuilderContextBase');
const KnexOperation = require('./operations/KnexOperation');

module.exports = class JoinBuilder extends QueryBuilderOperationSupport {

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  using(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  on(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orOn(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  onBetween(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  onNotBetween(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orOnBetween(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orOnNotBetween(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  onIn(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  onNotIn(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orOnIn(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orOnNotIn(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  onNull(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orOnNull(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  onNotNull(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orOnNotNull(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  onExists(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orOnExists(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  onNotExists(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orOnNotExists(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  type(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  or(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andOn(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andOnIn(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andOnNotIn(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andOnNull(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andOnNotNull(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andOnExists(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andOnNotExists(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andOnBetween(...args) {}

  /**
   * @returns {JoinBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andOnNotBetween(...args) {}

}
