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
    return this.onCall(builder);
  }

  /**
   * @param {QueryBuilder} builder
   * @returns {boolean}
   */
  onCall(builder) {
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

  onAfterModelCreateFront(builder, result) {}

  onAfterModelCreate(builder, result) {}

  onAfter(builder, result) {}

  /**
   * @param {QueryBuilder} builder
   */
  onBeforeBuild(builder) {}

  /**
   * @param {QueryBuilder} knexBuilder
   * @param {QueryBuilder} builder
   */
  onBuild(knexBuilder, builder) {}
}