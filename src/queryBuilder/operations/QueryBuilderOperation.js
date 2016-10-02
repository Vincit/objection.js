export default class QueryBuilderOperation {

  /**
   * @param {knex} knex
   * @param {string} name
   * @param {Object} opt
   */
  constructor(name, opt) {
    this.name = name;
    this.opt = opt || {};
    this.isWriteOperation = false;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {Array.<*>} args
   * @returns {boolean}
   */
  call(builder, args) {
    return true;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {*} result
   * @returns {Promise|*}
   */
  onBefore(builder, result) {}

  /**
   * @returns {boolean}
   */
  hasOnBefore() {
    return this.onBefore !== QueryBuilderOperation.prototype.onBefore;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {*} result
   * @returns {Promise|*}
   */
  onBeforeInternal(builder, result) {}

  /**
   * @returns {boolean}
   */
  hasOnBeforeInternal() {
    return this.onBeforeInternal !== QueryBuilderOperation.prototype.onBeforeInternal;
  }

  /**
   * @param {QueryBuilder} builder
   */
  onBeforeBuild(builder) {}

  /**
   * @returns {boolean}
   */
  hasOnBeforeBuild() {
    return this.onBeforeBuild !== QueryBuilderOperation.prototype.onBeforeBuild;
  }

  /**
   * @param {QueryBuilder} knexBuilder
   * @param {QueryBuilder} builder
   */
  onBuild(knexBuilder, builder) {}

  /**
   * @returns {boolean}
   */
  hasOnBuild() {
    return this.onBuild !== QueryBuilderOperation.prototype.onBuild;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {*} result
   * @returns {*}
   */
  onRawResult(builder, result) {
    return rows;
  }

  /**
   * @returns {boolean}
   */
  hasOnRawResult() {
    return this.onRawResult !== QueryBuilderOperation.prototype.onRawResult;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {*} result
   * @returns {Promise|*}
   */
  onAfterQuery(builder, result) {}

  /**
   * @returns {boolean}
   */
  hasOnAfterQuery() {
    return this.onAfterQuery !== QueryBuilderOperation.prototype.onAfterQuery;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {*} result
   * @returns {Promise|*}
   */
  onAfterInternal(builder, result) {}

  /**
   * @returns {boolean}
   */
  hasOnAfterInternal() {
    return this.onAfterInternal !== QueryBuilderOperation.prototype.onAfterInternal;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {*} result
   * @returns {Promise|*}
   */
  onAfter(builder, result) {}

  /**
   * @returns {boolean}
   */
  hasOnAfter() {
    return this.onAfter !== QueryBuilderOperation.prototype.onAfter;
  }

  /**
   * @param {QueryBuilder} builder
   * @returns {QueryBuilder}
   */
  queryExecutor(builder) {}

  /**
   * @returns {boolean}
   */
  hasQueryExecutor() {
    return this.queryExecutor !== QueryBuilderOperation.prototype.queryExecutor;
  }
}