import _ from 'lodash';
import QueryBuilderBase from '../QueryBuilderBase';
import {isKnexQueryBuilder} from '../../utils/dbUtils';

export default class QueryBuilderMethod {

  /**
   * @param {QueryBuilderBase} builder
   * @param {string} name
   * @param {Object} opt
   */
  constructor(builder, name, opt) {
    this.name = name;
    this.opt = opt || {};
    this.knex = builder.knex();
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
   * @param {QueryBuilderBase} builder
   * @param {Array.<*>} args
   * @returns {boolean}
   */
  call(builder, args) {
    return this.onCall(builder);
  }

  /**
   * @param {QueryBuilderBase} builder
   * @returns {boolean}
   */
  onCall(builder) {
    return true;
  }

  /**
   * @param {QueryBuilder} knexBuilder
   */
  onBuild(knexBuilder) {
    // Do nothing by default.
  }
}