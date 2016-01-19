import _ from 'lodash';
import jsonFieldExpressionParser from './parsers/jsonFieldExpressionParser';
import InsertionOrUpdate from './InsertionOrUpdate';
import {inherits} from '../utils/classUtils';
import {isKnexQueryBuilder,  overwriteForDatabase} from '../utils/dbUtils';

/**
 * Knex query builder wrapper.
 *
 * This class is a thin wrapper around knex query builder. This class allows us to add our own
 * query builder methods without monkey patching knex query builder.
 *
 * @constructor
 * @ignore
 */
@overwriteForDatabase()
export default class QueryBuilderBase {

  constructor(knex) {
    this._knex = knex;
    this._knexMethodCalls = [];
    this._context = {};
  }

  /**
   * Makes the given constructor a subclass of this class.
   *
   * @param {function=} subclassConstructor
   * @return {Class.<QueryBuilderBase>}
   */
  static extend(subclassConstructor) {
    inherits(subclassConstructor, this);
    return subclassConstructor;
  }

  /**
   * Sets/gets the query context.
   */
  context() {
    if (arguments.length === 0) {
      return this._context.userContext;
    } else {
      this._context.userContext = arguments[0];
      return this;
    }
  }

  /**
   * Sets/gets the query full internal context.
   *
   * For internal use only.
   *
   * @ignore
   */
  internalContext() {
    if (arguments.length === 0) {
      return this._context;
    } else {
      this._context = arguments[0];
      return this;
    }
  }

  /**
   * Returns the knex connection passed to the constructor.
   *
   * @ignore
   */
  knex() {
    return this._knex;
  }

  /**
   * Calls the given function immediately and passes `this` as an argument.
   *
   * Handy for chaining conditional stuff:
   *
   * ```js
   * new QueryBuilderBase().call(function (builder) {
   *   if (someCondition) {
   *     builder.where('something', someValue);
   *   }
   * });
   * ```
   *
   * @param {function} func
   * @returns {QueryBuilderBase}
   */
  call(func) {
    func.call(this, this);
    return this;
  }

  /**
   * Returns the SQL string.
   *
   * @returns {string}
   */
  toString() {
    return this.build().toString();
  }

  /**
   * Returns the SQL string.
   *
   * @returns {string}
   */
  toSql() {
    return this.toString();
  }

  /**
   * Create a clone of this builder.
   *
   * @returns {QueryBuilderBase}
   */
  clone() {
    var clone = new this.constructor(this._knex);
    this.cloneInto(clone);
    return clone;
  }

  /**
   * @protected
   */
  cloneInto(builder) {
    builder._knex = this._knex;
    builder._knexMethodCalls = this._knexMethodCalls.slice();
    builder._context = this._context;
  }

  /**
   * Removes query builder method calls.
   *
   * @param {RegExp=} methodNameRegex
   *    Optional patter to that must match the method names to remove.
   *    If not given, all calls are removed.
   *
   * @ignore
   */
  clear(methodNameRegex) {
    if (methodNameRegex) {
      // Reject all query method calls that don't pass the filter.
      this._knexMethodCalls = _.reject(this._knexMethodCalls, call => methodNameRegex.test(call.method));
    } else {
      // If no arguments are given, clear all query method calls.
      this._knexMethodCalls = [];
    }

    return this;
  }

  /**
   * Copy query builder method calls from another query builder.
   *
   * @param {QueryBuilderBase} queryBuilder
   *    The builder to copy from.
   *
   * @param {RegExp} methodNameRegex
   *    Optional regular expression to filter which method calls are copied.
   *
   * @ignore
   */
  copyFrom(queryBuilder, methodNameRegex) {
    var self = this;

    _.forEach(queryBuilder._knexMethodCalls, call => {
      if (!methodNameRegex || methodNameRegex.test(call.method)) {
        self._knexMethodCalls.push(call);
      }
    });

    return this;
  }

  /**
   * Returns true if the builder has a call to a method whose name matches the `methodNameRegex`.
   *
   * @param {RegExp} methodNameRegex
   *
   * @ignore
   */
  has(methodNameRegex) {
    return _.any(this._knexMethodCalls, call => {
      return methodNameRegex.test(call.method);
    });
  }

  /**
   * Builds the query into a knex query builder.
   *
   * @returns {knex.QueryBuilder}
   *    The built knex query builder.
   *
   * @protected
   */
  build() {
    return this.buildInto(this._knex.queryBuilder());
  }

  /**
   * @private
   */
  buildInto(knexBuilder) {
    _.forEach(this._knexMethodCalls, call => {
      if (_.isFunction(knexBuilder[call.method])) {
        knexBuilder[call.method].apply(knexBuilder, call.args);
      }
    });

    return knexBuilder;
  }

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  insert(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  update(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  delete(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod('delete')
  del(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  select(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  forUpdate(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  forShare(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  as(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  columns(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  column(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  from(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  fromJS(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  into(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  withSchema(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  table(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  distinct(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  join(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  joinRaw(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  innerJoin(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  leftJoin(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  leftOuterJoin(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  rightJoin(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  rightOuterJoin(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  outerJoin(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  fullOuterJoin(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  crossJoin(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  where(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  andWhere(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhere(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNot(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNot(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereRaw(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereWrapped(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  havingWrapped(...args) {}


  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereRaw(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereExists(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereExists(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNotExists(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNotExists(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereIn(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereIn(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNotIn(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   */
  @knexQueryMethod()
  orWhereNotIn(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNull(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNull(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNotNull(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNotNull(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereBetween(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  whereNotBetween(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereBetween(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orWhereNotBetween(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  groupBy(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  groupByRaw(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orderBy(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orderByRaw(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  union(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  unionAll(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  having(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  havingRaw(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orHaving(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  orHavingRaw(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  offset(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  limit(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  count(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  countDistinct(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  min(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  max(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  sum(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  avg(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  avgDistinct(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  debug(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  returning(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  truncate(...args) {}

  /**
   * See <a href="http://knexjs.org">knex documentation</a>
   * @returns {QueryBuilderBase}
   */
  @knexQueryMethod()
  connection(...args) {}

  /**
   * Compares a column reference to another
   *
   * ```js
   * builder.whereRef('Person.id', '=', 'Animal.ownerId');
   * ```
   */
  whereRef(lhs, op, rhs) {
    return this._whereRef('and', lhs, op, rhs);
  }

  /**
   * Compares a column reference to another
   *
   * ```js
   * builder.orWhereRef('Person.id', '=', 'Animal.ownerId');
   * ```
   */
  orWhereRef(lhs, op, rhs) {
    return this._whereRef('or', lhs, op, rhs);
  }

  /**
   * `where` for (possibly) composite keys.
   *
   * ```js
   * builder.whereComposite(['id', 'name'], [1, 'Jennifer']);
   * ```
   *
   * ```js
   * builder.whereComposite('id', '=', 1);
   * ```
   *
   * @param {string|Array.<string>} cols
   * @param {string|*|Array.<*>} op
   * @param {*|Array.<*>=} values
   *
   * @returns {QueryBuilderBase}
   */
  whereComposite(cols, op, values) {
    if (_.isUndefined(values)) {
      values = op;
      op = '=';
    }

    let colsIsArray = _.isArray(cols);
    let valuesIsArray = _.isArray(values);

    if (!colsIsArray && !valuesIsArray) {
      return this.where(cols, op, values);
    } else if (colsIsArray && cols.length === 1 && !valuesIsArray) {
      return this.where(cols[0], op, values);
    } else if (colsIsArray && valuesIsArray && cols.length === values.length) {
      _.each(cols, (col, idx) => this.where(col, op, values[idx]));
      return this;
    } else {
      throw new Error('both cols and values must have same dimensions');
    }
  }

  /**
   * `whereIn` for (possibly) composite keys.
   *
   *
   * ```js
   * builder.whereInComposite(['a', 'b'], [[1, 2], [3, 4], [1, 4]]);
   * ```
   *
   * ```js
   * builder.whereInComposite('a', [[1], [3], [1]]);
   * ```
   *
   * ```js
   * builder.whereInComposite('a', [1, 3, 1]);
   * ```
   *
   * ```js
   * builder.whereInComposite(['a', 'b'], SomeModel.query().select('a', 'b'));
   * ```
   *
   * @returns {QueryBuilderBase}
   */
  @overwriteForDatabase({
    sqlite3: 'whereInComposite_sqlite3'
  })
  whereInComposite(columns, values) {
    let isCompositeKey = _.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      if (_.isArray(values)) {
        return this.whereIn(columns, values);
      } else {
        // Because of a bug in knex, we need to build the where-in query from pieces
        // if the value is a subquery.
        let formatter = this._knex.client.formatter();
        let sql = '(' + _.map(columns, col => formatter.wrap(col)).join() + ')';
        return this.whereIn(this._knex.raw(sql), values);
      }
    } else {
      let col = _.isString(columns) ? columns : columns[0];

      if (_.isArray(values)) {
        values = _.compact(_.flatten(values));
      }

      // For non-composite keys we can use the normal whereIn.
      return this.whereIn(col, values);
    }
  }

  /**
   * @private
   */
  whereInComposite_sqlite3(columns, values) {
    let isCompositeKey = _.isArray(columns) && columns.length > 1;

    if (isCompositeKey) {
      if (!_.isArray(values)) {
        // If the `values` is not an array of values but a function or a subquery
        // we have no way to implement this method.
        throw new Error('sqlite doesn\'t support multi-column where in clauses');
      }

      // Sqlite doesn't support the `where in` syntax for multiple columns but
      // we can emulate it using grouped `or` clauses.
      return this.where(builder => {
        _.each(values, (val) => {
          builder.orWhere(builder => {
            _.each(columns, (col, idx) => {
              builder.andWhere(col, val[idx]);
            });
          });
        });
      });
    } else {
      let col = _.isString(columns) ? columns : columns[0];

      if (_.isArray(values)) {
        values = _.compact(_.flatten(values));
      }

      // For non-composite keys we can use the normal whereIn.
      return this.whereIn(col, values);
    }
  }

  /**
   * Json query APIs
   */

   /**
    * @typedef {String} FieldExpression
    *
    * Field expressions allow one to refer to separate JSONB fields inside columns.
    *
    * Syntax: <column reference>[:<json field reference>]
    *
    * e.g. `Person.jsonColumnName:details.names[1]` would refer to value `'Second'`
    * in column `Person.jsonColumnName` which has
    * `{ details: { names: ['First', 'Second', 'Last'] } }` object stored in it.
    *
    * First part `<column reference>` is compatible with column references used in
    * knex e.g. `MyFancyTable.tributeToThBestColumnNameEver`.
    *
    * Second part describes a path to an attribute inside the referred column.
    * It is optional and it always starts with colon which follows directly with
    * first path element. e.g. `Table.jsonObjectColumnName:jsonFieldName` or
    * `Table.jsonArrayColumn:[321]`.
    *
    * Syntax supports `[<key or index>]` and `.<key or index>` flavors of reference
    * to json keys / array indexes:
    *
    * e.g. both `Table.myColumn:[1][3]` and `Table.myColumn:1.3` would access correctly
    * both of the following objects `[null, [null,null,null, "I was accessed"]]` and
    * `{ "1": { "3" : "I was accessed" } }`
    *
    * Caveats when using special characters in keys:
    *
    * 1. `objectColumn.key` This is the most common syntax, good if you are
    *    not using dots or square brackets `[]` in your json object key name.
    * 2. Keys containing dots `objectColumn:[keywith.dots]` Column `{ "keywith.dots" : "I was referred" }`
    * 3. Keys containing square brackets `column['[]']` `{ "[]" : "This is getting ridiculous..." }`
    * 4. Keys containing square brackets and quotes
    *    `objectColumn:['Double."Quote".[]']` and `objectColumn:["Sinlge.'Quote'.[]"]`
    *    Column `{ "Double.\"Quote\".[]" : "I was referred",  "Sinlge.'Quote'.[]" : "Mee too!" }`
    * 99. Keys containing dots, square brackets, single quotes and double quotes in one json key is
    *     not currently supported
    */

  /**
   * Where jsonb field reference equals jsonb object or other field reference.
   *
   * Also supports having field expression in both sides of equality.
   *
   * ```js
   * Person
   *   .query()
   *   .whereJsonEquals('additionalData:myDogs', 'additionalData:dogsAtHome')
   *   .then(function (people) {
   *     // oh joy! these people have all their dogs at home!
   *   });
   *
   * Person
   *   .query()
   *   .whereJsonEquals('additionalData:myDogs[0]', { name: "peter"})
   *   .then(function (people) {
   *     // these people's first dog name is "peter" and the dog has no other
   *     // attributes, but its name
   *   });
   * ```
   *
   * @param {FieldExpression} fieldExpression
   *    Reference to column / json field.
   *
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   *    Reference to column / json field or json object.
   *
   * @returns {QueryBuilderBase}
   */
  whereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "=", jsonObjectOrFieldExpression);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonEquals}
   */
  orWhereJsonEquals(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "=", jsonObjectOrFieldExpression);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonEquals}
   */
  whereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "!=", jsonObjectOrFieldExpression);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonEquals}
   */
  orWhereJsonNotEquals(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "!=", jsonObjectOrFieldExpression);
  }

  /**
   * Where left hand json field reference is a superset of the right hand json value or reference.
   *
   * ```js
   * Person
   *   .query()
   *   .whereJsonSupersetOf('additionalData:myDogs', 'additionalData:dogsAtHome')
   *   .then(function (people) {
   *     // These people have all or some of their dogs at home. Person might have some
   *     // additional dogs in their custody since myDogs is superset of dogsAtHome.
   *   });
   *
   * Person
   *   .query()
   *   .whereJsonSupersetOf('additionalData:myDogs[0]', { name: "peter"})
   *   .then(function (people) {
   *     // These people's first dog name is "peter", but the dog might have
   *     // additional attributes as well.
   *   });
   * ```
   *
   * Object and array are always their own supersets.
   *
   * For arrays this means that left side matches if it has all the elements
   * listed in the right hand side. e.g.
   *
   * ```
   * [1,2,3] isSuperSetOf [2] => true
   * [1,2,3] isSuperSetOf [2,1,3] => true
   * [1,2,3] isSuperSetOf [2,null] => false
   * [1,2,3] isSuperSetOf [] => true
   * ```
   *
   * The `not` variants with jsonb operators behave in a way that they won't match rows, which don't have
   * the referred json key referred in field expression. e.g. for table
   *
   * ```
   *  id |    jsonObject
   * ----+--------------------------
   *   1 | {}
   *   2 | NULL
   *   3 | {"a": 1}
   *   4 | {"a": 1, "b": 2}
   *   5 | {"a": ['3'], "b": ['3']}
   * ```
   *
   * query:
   *
   * ```js
   * builder.whereJsonNotEquals("jsonObject:a", "jsonObject:b")
   * ```
   *
   * Returns only the row `4` which has keys `a` and `b` and `a` != `b`, but it won't return any rows which
   * does not have `jsonObject.a` or `jsonObject.b`.
   *
   * @param {FieldExpression} fieldExpression
   *    Reference to column / json field, which is tested for being a superset.
   *
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   *    To which to compare.
   *
   * @returns {QueryBuilderBase}
   */
  whereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonSupersetOf}
   */
  orWhereJsonSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonSupersetOf}
   */
  whereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression, 'not');
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonSupersetOf}
   */
  orWhereJsonNotSupersetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", jsonObjectOrFieldExpression, 'not');
  }

  /**
   * Where left hand json field reference is a subset of the right hand json value or reference.
   *
   * Object and array are always their own subsets.
   *
   * @see {@link QueryBuilderBase#whereJsonSupersetOf}
   *
   * @param {FieldExpression} fieldExpression
   * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonSubsetOf}
   */
  orWhereJsonSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonSubsetOf}
   */
  whereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression, 'not');
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonSubsetOf}
   */
  orWhereJsonNotSubsetOf(fieldExpression, jsonObjectOrFieldExpression) {
    return orWhereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "<@", jsonObjectOrFieldExpression, 'not');
  }

  /**
   * Where json field reference is an array.
   *
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonIsArray(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, []);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonIsArray}
   */
  orWhereJsonIsArray(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, []);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonIsArray}
   * @note Also returns rows where `fieldExpression` does not exist.
   */
  whereJsonNotArray(fieldExpression) {
    let knex = this._knex;
    // uhh... ugly. own subquery builder could help... now this refers to plain knex subquery builder
    return this.where(function () {
      // not array
      let builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", [], 'not');
      let ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
      // or not exist
      builder.orWhereRaw(ifRefNotExistQuery);
    });
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonIsArray}
   * @note Also returns rows where `fieldExpression` does not exist.
   */
  orWhereJsonNotArray(fieldExpression) {
    let knex = this._knex;
    return this.orWhere(function () {
      // not array
      let builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", [], 'not');
      let ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
      // or not exist
      builder.orWhereRaw(ifRefNotExistQuery);
    });
  }

  /**
   * Where json field reference is an object.
   *
   * @param {FieldExpression} fieldExpression
   * @returns {QueryBuilderBase}
   */
  whereJsonIsObject(fieldExpression) {
    return this.whereJsonSupersetOf(fieldExpression, {});
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonIsObject}
   */
  orWhereJsonIsObject(fieldExpression) {
    return this.orWhereJsonSupersetOf(fieldExpression, {});
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonIsObject}
   * @note Also returns rows where `fieldExpression` does not exist.
   */
  whereJsonNotObject(fieldExpression) {
    let knex = this._knex;
    return this.where(function () {
      // not object
      let builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", {}, 'not');
      let ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
      // or not exist
      builder.orWhereRaw(ifRefNotExistQuery);
    });
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonIsObject}
   * @note Also returns rows where `fieldExpression` does not exist.
   */
  orWhereJsonNotObject(fieldExpression) {
    let knex = this._knex;
    return this.orWhere(function () {
      // not object
      let builder = whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", {}, 'not');
      let ifRefNotExistQuery = whereJsonFieldQuery(knex, fieldExpression, "IS", null);
      // or not exist
      builder.orWhereRaw(ifRefNotExistQuery);
    });
  }

  /**
   * Where any of given strings is found from json object key(s) or array items.
   *
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys Strings that are looked from object or array.
   * @returns {QueryBuilderBase}
   */
  whereJsonHasAny(fieldExpression, keys) {
    return whereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?|', keys);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonHasAny}
   */
  orWhereJsonHasAny(fieldExpression, keys) {
    return orWhereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?|', keys);
  }

  /**
   * Where all of given strings are found from json object key(s) or array items.
   *
   * @param {FieldExpression} fieldExpression
   * @param {string|Array.<string>} keys Strings that are looked from object or array.
   * @returns {QueryBuilderBase}
   */
  whereJsonHasAll(fieldExpression, keys) {
    return whereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?&', keys);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonHasAll}
   */
  orWhereJsonHasAll(fieldExpression, keys) {
    return orWhereJsonFieldRightStringArrayOnLeft(this, fieldExpression, '?&', keys);
  }

  /**
   * Where referred json field value casted to same type with value fulfill given operand.
   *
   * Value may be number, string, null, boolean and referred json field is converted
   * to TEXT, NUMERIC or BOOLEAN sql type for comparison.
   *
   * If left hand field does not exist rows appear IS null so if one needs to get only
   * rows, which has key and it's value is null one may use e.g.
   * `.whereJsonSupersetOf("column", { field: null })` or check is key exist and
   * then `.whereJsonField('column:field', 'IS', null)`
   *
   * For testing against objects or arrays one should see tested with whereJsonEqual,
   * whereJsonSupersetOf and whereJsonSubsetOf methods.
   *
   * @param {FieldExpression} fieldExpression Expression pointing to certain value.
   * @param {string} operator SQL comparator usually `<`, `>`, `<>`, `=` or `!=`
   * @param {boolean|Number|string|null} value Value to which field is compared to.
   * @returns {QueryBuilderBase}
   */
  whereJsonField(fieldExpression, operator, value) {
    let query = whereJsonFieldQuery(this._knex, fieldExpression, operator, value);
    return this.whereRaw(query);
  }

  /**
   * @see {@link QueryBuilderBase#whereJsonField}
   */
  orWhereJsonField(fieldExpression, operator, value) {
    let query = whereJsonFieldQuery(this._knex, fieldExpression, operator, value);
    return this.orWhereRaw(query);
  }

  /**
   * @private
   */
  _whereRef(bool, lhs, op, rhs) {
    if (!rhs) {
      rhs = op;
      op = '=';
    }

    let formatter = this._knex.client.formatter();
    op = formatter.operator(op);

    if (!_.isString(lhs) || !_.isString(rhs) || !_.isString(op)) {
      throw new Error('whereRef: invalid operands or operator');
    }

    let sql = formatter.wrap(lhs) + ' ' + op + ' ' + formatter.wrap(rhs);
    if (bool === 'or') {
      return this.orWhereRaw(sql);
    } else {
      return this.whereRaw(sql);
    }
  }
}

/**
 * @private
 */
function knexQueryMethod(overrideMethodName) {
  return function (target, methodName, descriptor) {
    descriptor.value = function () {
      let args = new Array(arguments.length);
      let context = this.internalContext();

      for (let i = 0, l = arguments.length; i < l; ++i) {
        if (_.isUndefined(arguments[i])) {
          // None of the query builder methods should accept undefined. Do nothing if
          // one of the arguments is undefined. This enables us to do things like
          // `.where('name', req.query.name)` without checking if req.query has the
          // property `name`.
          return this;
        } else if (arguments[i] instanceof QueryBuilderBase) {
          // Convert QueryBuilderBase instances into knex query builders.
          args[i] = arguments[i].internalContext(context).build();
        } else if (_.isFunction(arguments[i])) {
          // If an argument is a function, knex calls it with a query builder as
          // `this` context. We call the function with a QueryBuilderBase as
          // `this` context instead.
          args[i] = wrapFunctionArg(arguments[i], this);
        } else {
          args[i] = arguments[i];
        }
      }

      this._knexMethodCalls.push({
        method: overrideMethodName || methodName,
        args: args
      });

      return this;
    };
  };
}

/**
 * @private
 */
function wrapFunctionArg(func, query) {
  return function () {
    if (isKnexQueryBuilder(this)) {
      let context = query.internalContext();
      let builder = new QueryBuilderBase(query._knex).internalContext(context);
      func.call(builder, builder);
      builder.buildInto(this);
    } else {
      return func.apply(this, arguments);
    }
  };
}

/**
 * Parses a objection.js json field expression into a postgres jsonb field reference.
 *
 * For example, assume we have this object stored in the column `jsonColumn` of a table `Table`:
 *
 * ```
 * {obj: { "key.with.dots": [{"key": { "0": { me : [ "I was referred" ] } } } ] } }
 * ```
 *
 * We can refer to the value "I was referred" using the following field expression:
 *
 * ```
 * Table.jsonColumn:obj[key.with.dots][0].key.0.me[0]
 * ```
 *
 * Since Postgresql #>{field,0,field2,...} operator does not make difference if
 * reference is string or a number, one can actually use also jsonArray.0 notation
 * to refer index of an array. Like wise one can use object[123] notation to refer
 * key of an object { "123" : null }.
 *
 * @private
 * @param {string} expression
 * @param {boolean} extractAsText Return text instead of jsonb object (useful for type casting).
 * @returns {string} postgres json reference.
 */
function parseFieldExpression(expression, extractAsText) {
  let parsed = jsonFieldExpressionParser.parse(expression);
  let jsonRefs = _(parsed.access).pluck('ref').value().join(",");
  let extractor = extractAsText ? '#>>' : '#>';
  let middleQuotedColumnName = parsed.columnName.split('.').join('"."');
  return `"${middleQuotedColumnName}"${extractor}'{${jsonRefs}}'`;
}

/**
 * Where jsonb reference on left hand side is compared to jsonb value or reference on the right hand side.
 *
 * Converts left and right hand values to PostgreSQL acceptable format and add user chosen
 * operator between left and right hand expressions.
 *
 * ```javascript
 * whereJsonbRefOnLeftJsonbValOrRefOnRight(queryBuilder, "ModelJson.jsonObject:objectField", "<@", { key: 1 })
 * ```
 *
 * ```sql
 * select * from "ModelJson" where ("ModelJson"."jsonObject"#>'{objectField}')::jsonb <@ '{\"key\":\ 1}'::jsonb
 * ```
 *
 * @private
 * @param {QueryBuilderBase} builder
 * @param {FieldExpression} fieldExpression Reference to column / jsonField.
 * @param {string} operator operator to apply.
 * @param {Object|Array|FieldExpression} jsonObjectOrFieldExpression Reference to column / jsonField or json object.
 * @param {string=} queryPrefix string prepended to query e.g. 'not'. Space after string added implicitly.
 * @returns {QueryBuilderBase}
 */
function whereJsonbRefOnLeftJsonbValOrRefOnRight(builder, fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix) {
  let queryParams = whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix);
  return builder.whereRaw.apply(builder, queryParams);
}

/**
 * @private
 * @see {@link whereJsonbRefOnLeftJsonbValOrRefOnRight} for documentation.
 */
function orWhereJsonbRefOnLeftJsonbValOrRefOnRight(builder, fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix) {
  let queryParams = whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix);
  return builder.orWhereRaw.apply(builder, queryParams);
}

/**
 * @private
 * @see {@link whereJsonbRefOnLeftJsonbValOrRefOnRight} for documentation.
 * @return {Array} Parameters for whereRaw call.
 */
function whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(fieldExpression, operator, jsonObjectOrFieldExpression, queryPrefix) {
  let fieldReference = parseFieldExpression(fieldExpression);

  if (_.isString(jsonObjectOrFieldExpression)) {
    let rightHandReference = parseFieldExpression(jsonObjectOrFieldExpression);
    let refRefQuery = ["(", fieldReference, ")::jsonb", operator, "(", rightHandReference, ")::jsonb"];
    if (queryPrefix) {
      refRefQuery.unshift(queryPrefix);
    }
    return [refRefQuery.join(" ")];
  } else if (_.isObject(jsonObjectOrFieldExpression)) {
    let refValQuery = ["(", fieldReference, ")::jsonb", operator, "?::jsonb"];
    if (queryPrefix) {
      refValQuery.unshift(queryPrefix);
    }
    return [refValQuery.join(" "), JSON.stringify(jsonObjectOrFieldExpression)];
  }

  throw new Error("Invalid right hand expression.");
}

/**
 * Where field expression on left side and string or an array of strings on right hand side.
 *
 * ```javascript
 * whereJsonFieldRightStringArrayOnLeft(queryBuilder, "ModelJson.jsonObject:a", "?&",  ["1","2"])
 * ```
 *
 * ```sql
 * select * from "ModelJson" where "ModelJson"."jsonObject"#>'{a}' ?& array['1','2']
 * ```
 *
 * @private
 * @param {QueryBuilderBase} builder
 * @param {FieldExpression} fieldExpression
 * @param {string} operator
 * @param {Array.<string>} keys
 * @returns {QueryBuilderBase}
 */
function whereJsonFieldRightStringArrayOnLeft(builder, fieldExpression, operator, keys) {
  return builder.whereRaw(whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys));
}

/**
 * @private
 * @see {@link whereJsonFieldRightStringArrayOnLeft} for documentation.
 */
function orWhereJsonFieldRightStringArrayOnLeft(builder, fieldExpression, operator, keys) {
  return builder.orWhereRaw(whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys));
}

/**
 * @private
 * @see {@link whereJsonFieldRightStringArrayOnLeft} for documentation.
 */
function whereJsonFieldRightStringArrayOnLeftQuery(builder, fieldExpression, operator, keys) {
  let knex = builder._knex;
  let fieldReference = parseFieldExpression(fieldExpression);
  keys = _.isArray(keys) ? keys : [keys];

  let questionMarksArray = _.map(keys, function (key) {
    if (!_.isString(key)) {
      throw new Error("All keys to find must be strings.");
    }
    return "?";
  });

  let rawSqlTemplateString = "array[" + questionMarksArray.join(",") + "]";
  let rightHandExpression = knex.raw(rawSqlTemplateString, keys);

  return `${fieldReference} ${operator.replace('?', '\\?')} ${rightHandExpression}`;
}

/**
 * @private
 * @see {@link QueryBuilderBase#whereJsonField} for documentation.
 */
function whereJsonFieldQuery(knex, fieldExpression, operator, value) {
  let fieldReference = parseFieldExpression(fieldExpression, true);
  let normalizedOperator = normalizeOperator(knex, operator);

  // json type comparison takes json type in string format
  let cast;
  let escapedValue = knex.raw(" ?", [value]);
  if (_.isNumber(value)) {
    cast = "::NUMERIC";
  } else if (_.isBoolean(value)) {
    cast = "::BOOLEAN";
  } else if (_.isString(value)) {
    cast = "::TEXT";
  } else if (_.isNull(value)) {
    cast = "::TEXT";
    escapedValue = 'NULL';
  } else {
    throw new Error("Value must be string, number, boolean or null.");
  }

  return `(${fieldReference})${cast} ${normalizedOperator} ${escapedValue}`;
}

/**
 * @private
 * @param knex
 * @param {string} operator
 * @returns {string}
 */
function normalizeOperator(knex, operator) {
  let trimmedLowerCase = operator.trim().toLowerCase();

  switch (trimmedLowerCase) {
    case "is":
    case "is not":
      return trimmedLowerCase;
    default:
      return knex.client.formatter().operator(operator);
  }
}
