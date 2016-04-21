import _ from 'lodash';
import QueryBuilderBase from '../QueryBuilderBase';
import {isKnexQueryBuilder} from '../../utils/dbUtils';

export default class QueryBuilderMethod {

  /**
   * @param {QueryBuilder} builder
   * @param {string} name
   * @param {Object} opt
   */
  constructor(builder, name, opt) {
    this.name = name;
    this.opt = opt || {};
    this.knex = builder.knex();
    this.isWriteMethod = false;
  }

  /**
   * @returns {knex.Formatter}
   */
  formatter() {
    return this.knex.client.formatter();
  }

  /**
   * @returns {knex.Raw}
   */
  raw() {
    return this.knex.raw.apply(this._knex, arguments);
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
    return this.onBefore !== QueryBuilderMethod.prototype.onBefore;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {*} result
   * @returns {Promise|*}
   */
  onBeforeBack(builder, result) {}

  /**
   * @returns {boolean}
   */
  hasOnBeforeBack() {
    return this.onBeforeBack !== QueryBuilderMethod.prototype.onBeforeBack;
  }

  /**
   * @param {QueryBuilder} builder
   */
  onBeforeBuild(builder) {}

  /**
   * @returns {boolean}
   */
  hasOnBeforeBuild() {
    return this.onBeforeBuild !== QueryBuilderMethod.prototype.onBeforeBuild;
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
    return this.onBuild !== QueryBuilderMethod.prototype.onBuild;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {*} result
   * @returns {Promise|*}
   */
  onAfterModelCreateFront(builder, result) {}

  /**
   * @returns {boolean}
   */
  hasOnAfterModelCreateFront() {
    return this.onAfterModelCreateFront !== QueryBuilderMethod.prototype.onAfterModelCreateFront;
  }

  /**
   * @param {QueryBuilder} builder
   * @param {*} result
   * @returns {Promise|*}
   */
  onAfterModelCreate(builder, result) {}

  /**
   * @returns {boolean}
   */
  hasOnAfterModelCreate() {
    return this.onAfterModelCreate !== QueryBuilderMethod.prototype.onAfterModelCreate;
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
    return this.onAfter !== QueryBuilderMethod.prototype.onAfter;
  }

  /**
   * @param {QueryBuilder} builder
   * @returns {Promise|*}
   */
  queryExecutor(builder) {}

  /**
   * @returns {boolean}
   */
  hasQueryExecutor() {
    return this.queryExecutor !== QueryBuilderMethod.prototype.queryExecutor;
  }
}