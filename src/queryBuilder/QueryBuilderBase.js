const queryBuilderOperation = require('./decorators/queryBuilderOperation');
const QueryBuilderOperationSupport = require('./QueryBuilderOperationSupport');

const KnexOperation = require('./operations/KnexOperation');
const SelectOperation = require('./operations/SelectOperation');
const WhereRefOperation = require('./operations/WhereRefOperation');
const ReturningOperation = require('./operations/ReturningOperation');
const WhereCompositeOperation = require('./operations/WhereCompositeOperation');
const WhereInCompositeOperation = require('./operations/whereInComposite/WhereInCompositeOperation');
const WhereInCompositeSqliteOperation = require('./operations/whereInComposite/WhereInCompositeSqliteOperation');

const WhereJsonPostgresOperation = require('./operations/jsonApi/WhereJsonPostgresOperation');
const WhereJsonHasPostgresOperation = require('./operations/jsonApi/WhereJsonHasPostgresOperation');
const WhereJsonFieldPostgresOperation = require('./operations/jsonApi/WhereJsonFieldPostgresOperation');
const WhereJsonNotObjectPostgresOperation = require('./operations/jsonApi/WhereJsonNotObjectPostgresOperation');

/**
 * This class is a thin wrapper around knex query builder. This class allows us to add our own
 * query builder methods without monkey patching knex query builder.
 */

module.exports = class QueryBuilderBase extends QueryBuilderOperationSupport {

  static SelectSelector = SelectOperation;
  static WhereSelector = /where|orWhere|andWhere/;
  static FromSelector = /^(from|into|table)$/;

  /**
   * @return {boolean}
   */
  get isObjectionQueryBuilderBase() {
    return true;
  }

  /**
   * @return {boolean}
   */
  isSelectAll() {
    return !this.has(QueryBuilderBase.SelectSelector) && !this.has(QueryBuilderBase.WhereSelector);
  }

  /**
   * @param {function} func
   * @returns {QueryBuilderBase}
   */
  modify(func) {
    if (!func) {
      return this;
    }

    if (arguments.length === 1) {
      func.call(this, this);
    } else {
      let args = new Array(arguments.length);

      args[0] = this;
      for (let i = 1, l = args.length; i < l; ++i) {
        args[i] = arguments[i];
      }

      func.apply(this, args);
    }

    return this;
  }

  /**
   * @param {Transaction} trx
   * @returns {QueryBuilderBase}
   */
  transacting(trx) {
    this._context.knex = trx || null;
    return this;
  }

  clearSelect() {
    return this.clear(QueryBuilderBase.SelectSelector);
  }

  clearWhere() {
    return this.clear(QueryBuilderBase.WhereSelector);
  }

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  select(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  insert(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  update(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  delete(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation, 'delete')
  del(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  forUpdate(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  forShare(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  as(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  columns(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  column(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  from(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  fromJS(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  into(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  withSchema(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  table(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  distinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  join(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  joinRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  innerJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  leftJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  leftOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  rightJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  rightOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  outerJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  fullOuterJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  crossJoin(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  where(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andWhere(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhere(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNot(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNot(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereWrapped(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  havingWrapped(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNotExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNotExists(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNotIn(...args) {}

  /**
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNotIn(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNotNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNotNull(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andWhereBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  whereNotBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  andWhereNotBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orWhereNotBetween(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  groupBy(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  groupByRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orderBy(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orderByRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  union(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  unionAll(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  having(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  havingRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orHaving(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  orHavingRaw(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  offset(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  limit(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  count(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  countDistinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  min(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  max(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  sum(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  sumDistinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  avg(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(SelectOperation)
  avgDistinct(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  debug(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(ReturningOperation)
  returning(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  truncate(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  connection(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  options(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  columnInfo(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(KnexOperation)
  with(...args) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereRefOperation, {bool: 'and'}])
  whereRef(lhs, op, rhs) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereRefOperation, {bool: 'or'}])
  orWhereRef(lhs, op, rhs) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation(WhereCompositeOperation)
  whereComposite(cols, op, values) {}

  /**
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation({
    default: WhereInCompositeOperation,
    sqlite3: WhereInCompositeSqliteOperation
  })
  whereInComposite(columns, values) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '=', bool: 'and'}])
  whereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '=', bool: 'or'}])
  orWhereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '!=', bool: 'and'}])
  whereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '!=', bool: 'or'}])
  orWhereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'and'}])
  whereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'or'}])
  orWhereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'and', prefix: 'not'}])
  whereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '@>', bool: 'or', prefix: 'not'}])
  orWhereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'and'}])
  whereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'or'}])
  orWhereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'and', prefix: 'not'}])
  whereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonPostgresOperation, {operator: '<@', bool: 'or', prefix: 'not'}])
  orWhereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonIsArray(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, []);
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonIsArray(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, []);
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonIsObject(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, {});
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  orWhereJsonIsObject(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, {});
  }

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'and', compareValue: []}])
  whereJsonNotArray(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'or', compareValue: []}])
  orWhereJsonNotArray(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'and', compareValue: {}}])
  whereJsonNotObject(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonNotObjectPostgresOperation, {bool: 'or', compareValue: {}}])
  orWhereJsonNotObject(fieldExpression) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'and', operator: '?|'}])
  whereJsonHasAny(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'or', operator: '?|'}])
  orWhereJsonHasAny(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'and', operator: '?&'}])
  whereJsonHasAll(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonHasPostgresOperation, {bool: 'or', operator: '?&'}])
  orWhereJsonHasAll(fieldExpression, keys) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string} operator
   * @param {boolean|Number|string|null} value
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonFieldPostgresOperation, {bool: 'and'}])
  whereJsonField(fieldExpression, operator, value) {}

  /**
   * @param {FieldExpression} fieldExpression
   * @param {string} operator
   * @param {boolean|Number|string|null} value
   * @returns {QueryBuilderBase}
   */
  @queryBuilderOperation([WhereJsonFieldPostgresOperation, {bool: 'or'}])
  orWhereJsonField(fieldExpression, operator, value) {}
}
