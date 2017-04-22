const KnexOperation = require('./operations/KnexOperation');
const QueryBuilderContextBase = require('./QueryBuilderContextBase');
const {inherits} = require('../utils/classUtils');

/**
 * Base functionality to be able to use query builder operation annotations.
 */

module.exports = class QueryBuilderOperationSupport {

  constructor(knex, QueryBuilderContext) {
    /**
     * @type {knex}
     * @protected
     */
    this._knex = knex;
    /**
     * @type {Array.<QueryBuilderOperation>}
     * @protected
     */
    this._operations = [];
    /**
     * @type {QueryBuilderContextBase}
     * @protected
     */
    this._context = new (QueryBuilderContext || QueryBuilderContextBase)(this._createUserContextBase());
  }

  /**
   * @param {function=} subclassConstructor
   * @return {Constructor.<QueryBuilderOperationSupport>}
   */
  static extend(subclassConstructor) {
    inherits(subclassConstructor, this);
    return subclassConstructor;
  }

  /**
   * @param {Object=} ctx
   * @returns {Object|QueryBuilderOperationSupport}
   */
  context(ctx) {
    if (arguments.length === 0) {
      return this._context.userContext;
    } else {
      const ctxBase = this._createUserContextBase();
      this._context.userContext = Object.assign(ctxBase, ctx);
      return this;
    }
  }

  /**
   * @param {Object=} ctx
   * @returns {QueryBuilderOperationSupport}
   */
  mergeContext(ctx) {
    const oldCtx = this._context.userContext;
    this._context.userContext = Object.assign(oldCtx, ctx);
    return this;
  }

  /**
   * @param {QueryBuilderContextBase=} ctx
   * @returns {QueryBuilderContextBase|QueryBuilderOperationSupport}
   */
  internalContext(ctx) {
    if (arguments.length === 0) {
      return this._context;
    } else {
      this._context = ctx;
      return this;
    }
  }

  /**
   * @param {Object|InternalOptions} opt
   * @returns {InternalOptions|QueryBuilderOperationSupport}
   */
  internalOptions(opt) {
    if (arguments.length === 0) {
      return this._context.options;
    } else {
      Object.assign(this._context.options, opt);
      return this;
    }
  }

  /**
   * @param {knex=} knex
   * @returns {Object|QueryBuilderOperationSupport}
   */
  knex(knex) {
    if (arguments.length === 0) {
      const knex = this._context.knex || this._knex;

      if (!knex) {
        throw new Error(
          `no database connection available for a query for table ${this.modelClass().tableName}. ` +
          `You need to bind the model class or the query to a knex instance.`);
      }

      return knex;
    } else {
      this._knex = knex;
      return this;
    }
  }

  /**
   * @param {RegExp|Constructor.<? extends QueryBuilderOperation>} operationSelector
   * @return {QueryBuilderBase}
   */
  clear(operationSelector) {
    const operations = [];

    this.forEachOperation(operationSelector, (op) => {
      operations.push(op);
    }, false);

    this._operations = operations;
    return this;
  }

  /**
   * @param {QueryBuilderBase} queryBuilder
   * @param {RegExp|Constructor.<? extends QueryBuilderOperation>} operationSelector
   * @return {QueryBuilderBase}
   */
  copyFrom(queryBuilder, operationSelector) {
    queryBuilder.forEachOperation(operationSelector, (op) => {
      this._operations.push(op);
    });

    return this;
  }

  /**
   * @param {RegExp|Constructor.<? extends QueryBuilderOperation>} operationSelector
   * @returns {boolean}
   */
  has(operationSelector) {
    let found = false;

    this.forEachOperation(operationSelector, () => {
      found = true;
      return false;
    });

    return found;
  }

  /**
   * @param {RegExp|Constructor.<? extends QueryBuilderOperation>} operationSelector
   * @returns {boolean}
   */
  indexOfOperation(operationSelector) {
    let idx = -1;

    this.forEachOperation(operationSelector, (op, i) => {
      idx = i;
      return false;
    });

    return idx;
  }

  /**
   * @param {RegExp|Constructor.<? extends QueryBuilderOperation>} operationSelector
   * @param {function(QueryBuilderOperation)} callback
   * @param {boolean} match
   * @returns {QueryBuilderBase}
   */
  forEachOperation(operationSelector, callback, match = true) {
    if (operationSelector instanceof RegExp) {
      this._forEachOperationRegex(operationSelector, callback, match);
    } else {
      this._forEachOperationInstanceOf(operationSelector, callback, match);
    }

    return this;
  }

  /**
   * @param {QueryBuilderOperation} operation
   * @param {Array.<*>} args
   * @param {Boolean=} pushFront
   * @returns {QueryBuilderOperationSupport}
   */
   callQueryBuilderOperation(operation, args, pushFront) {
    if (operation.call(this, args || [])) {
      if (pushFront) {
        this._operations.unshift(operation);
      } else {
        this._operations.push(operation);
      }
    }

    return this;
  }

  /**
   * @param {string} methodName
   * @param {Array.<*>} args
   * @param {boolean=} pushFront
   * @returns {QueryBuilderOperationSupport}
   */
  callKnexQueryBuilderOperation(methodName, args, pushFront) {
    return this.callQueryBuilderOperation(new KnexOperation(methodName), args, pushFront);
  }

  /**
   * @returns {QueryBuilderOperationSupport}
   */
  clone() {
    return this.baseCloneInto(new this.constructor(this.knex()));
  }

  /**
   * @protected
   * @returns {QueryBuilderOperationSupport}
   */
  baseCloneInto(builder) {
    builder._knex = this._knex;
    builder._operations = this._operations.slice();
    builder._context = this._context.clone();

    return builder;
  }

  /**
   * @returns {knex.QueryBuilder}
   */
  build() {
    return this.buildInto(this.knex().queryBuilder());
  }

  /**
   * @protected
   */
  buildInto(knexBuilder) {
    const tmp = new Array(10);

    let i = 0;
    while (i < this._operations.length) {
      const op = this._operations[i];
      const ln = this._operations.length;

      op.onBeforeBuild(this);

      const numNew = this._operations.length - ln;

      // onBeforeBuild may call methods that add more operations. If
      // this was the case, move the operations to be executed next.
      if (numNew > 0) {
        while (tmp.length < numNew) {
          tmp.push(null);
        }

        // Copy the new operations to tmp.
        for (let j = 0; j < numNew; ++j) {
          tmp[j] = this._operations[ln + j];
        }

        // Make room for the new operations after the current operation.
        for (let j = ln + numNew - 1; j > i + numNew; --j) {
          this._operations[j] = this._operations[j - numNew];
        }

        // Move the new operations after the current operation.
        for (let j = 0; j < numNew; ++j) {
          this._operations[i + j + 1] = tmp[j];
        }
      }

      ++i;
    }

    // onBuild operations should never add new operations. They should only call
    // methods on the knex query builder.
    for (let i = 0, l = this._operations.length; i < l; ++i) {
      this._operations[i].onBuild(knexBuilder, this);

      if (this._operations.length !== l) {
        throw new Error('onBuild should only call query building methods on the knex builder');
      }
    }

    return knexBuilder;
  }

  /**
   * @returns {string}
   */
  toString() {
    return this.build().toString();
  }

  /**
   * @returns {string}
   */
  toSql() {
    return this.toString();
  }

  /**
   * @returns {QueryBuilderOperationSupport}
   */
  skipUndefined() {
    this._context.options.skipUndefined = true;
    return this;
  }

  /**
   * @private
   */
  _createUserContextBase() {
    const ctxProto = {};

    Object.defineProperty(ctxProto, 'transaction', {
      enumerable: false,
      get: () => this.knex()
    });

    return Object.create(ctxProto);
  }

  /**
   * @private
   */
  _forEachOperationRegex(operationSelector, callback, match) {
    for (let i = 0, l = this._operations.length; i < l; ++i) {
      const op = this._operations[i];

      if (operationSelector.test(op.name) === match) {
        if (callback(op, i) === false) {
          break;
        }
      }
    }
  }

  /**
   * @private
   */
  _forEachOperationInstanceOf(operationSelector, callback, match) {
    for (let i = 0, l = this._operations.length; i < l; ++i) {
      const op = this._operations[i];

      if ((op instanceof operationSelector) === match) {
        if (callback(op, i) === false) {
          break;
        }
      }
    }
  }
}
