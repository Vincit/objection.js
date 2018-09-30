const { isString, mergeMaps } = require('../utils/objectUtils');

const QueryBuilderContextBase = require('./QueryBuilderContextBase');
const QueryBuilderUserContext = require('./QueryBuilderUserContext');

class QueryBuilderOperationSupport {
  constructor(knex) {
    this._knex = knex;
    this._operations = [];
    this._context = new this.constructor.QueryBuilderContext(this);
    this._parentQuery = null;
  }

  static get QueryBuilderContext() {
    return QueryBuilderContextBase;
  }

  static get QueryBuilderUserContext() {
    return QueryBuilderUserContext;
  }

  context(obj) {
    const ctx = this._context;

    if (arguments.length === 0) {
      return ctx.userContext;
    } else {
      ctx.userContext = ctx.userContext.newFromObject(this, obj);
      return this;
    }
  }

  mergeContext(obj) {
    const ctx = this._context;
    ctx.userContext = ctx.userContext.newMerge(this, obj);
    return this;
  }

  internalContext(ctx) {
    if (arguments.length === 0) {
      return this._context;
    } else {
      this._context = ctx;
      return this;
    }
  }

  internalOptions(opt) {
    if (arguments.length === 0) {
      return this._context.options;
    } else {
      const oldOpt = this._context.options;
      this._context.options = Object.assign(oldOpt, opt);
      return this;
    }
  }

  tableNameFor(tableName, newTableName) {
    const ctx = this.internalContext();
    const tableMap = ctx.tableMap;

    if (isString(newTableName)) {
      ctx.tableMap = tableMap || new Map();
      ctx.tableMap.set(tableName, newTableName);
      return this;
    } else {
      return (tableMap && tableMap.get(tableName)) || tableName;
    }
  }

  aliasFor(tableName, alias) {
    const ctx = this.internalContext();
    const aliasMap = ctx.aliasMap;

    if (isString(alias)) {
      ctx.aliasMap = aliasMap || new Map();
      ctx.aliasMap.set(tableName, alias);
      return this;
    } else {
      return (aliasMap && aliasMap.get(tableName)) || null;
    }
  }

  tableRefFor(tableName) {
    return this.aliasFor(tableName) || this.tableNameFor(tableName);
  }

  childQueryOf(query, fork) {
    if (query) {
      let ctx = query.internalContext();

      if (fork) {
        ctx = ctx.clone();
      }

      this._parentQuery = query;
      this.internalContext(ctx);

      // Use the parent's knex if there was no knex in `ctx`.
      if (this.unsafeKnex() === null) {
        this.knex(query.unsafeKnex());
      }
    }

    return this;
  }

  subqueryOf(query) {
    const ctx = query.internalContext();

    // Merge alias and table name maps for subqueries.
    ctx.aliasMap = mergeMaps(query.internalContext().aliasMap, ctx.aliasMap);
    ctx.tableMap = mergeMaps(query.internalContext().tableMap, ctx.tableMap);

    if (query) {
      this._parentQuery = query;
      this.knex(query.unsafeKnex());
    }

    return this;
  }

  parentQuery() {
    return this._parentQuery;
  }

  knex() {
    if (arguments.length === 0) {
      const knex = this.unsafeKnex();

      if (!knex) {
        throw new Error(
          `no database connection available for a query. You need to bind the model class or the query to a knex instance.`
        );
      }

      return knex;
    } else {
      this._knex = arguments[0];
      return this;
    }
  }

  unsafeKnex() {
    return this._context.knex || this._knex || null;
  }

  clear(operationSelector) {
    const operations = [];

    this.forEachOperation(
      operationSelector,
      op => {
        operations.push(op);
      },
      false
    );

    this._operations = operations;
    return this;
  }

  copyFrom(queryBuilder, operationSelector) {
    const operations = this._operations;

    queryBuilder.forEachOperation(operationSelector, op => {
      operations.push(op);
    });

    return this;
  }

  has(operationSelector) {
    return this.indexOfOperation(operationSelector) !== -1;
  }

  indexOfOperation(operationSelector) {
    let idx = -1;

    this.forEachOperation(operationSelector, (op, i) => {
      idx = i;
      return false;
    });

    return idx;
  }

  indexOfLastOperation(operationSelector) {
    let idx = -1;

    this.forEachOperation(operationSelector, (op, i) => {
      idx = i;
    });

    return idx;
  }

  findLastOperation(operationSelector) {
    const idx = this.indexOfLastOperation(operationSelector);

    if (idx !== -1) {
      return this._operations[idx];
    } else {
      return null;
    }
  }

  forEachOperation(operationSelector, callback, match) {
    match = match == null ? true : match;

    let check;
    if (operationSelector instanceof RegExp) {
      check = op => operationSelector.test(op.name);
    } else if (isString(operationSelector)) {
      check = op => op.name === operationSelector;
    } else {
      check = op => op.is(operationSelector);
    }

    for (let i = 0, l = this._operations.length; i < l; ++i) {
      const op = this._operations[i];

      if (check(op) === match) {
        if (callback(op, i) === false) {
          break;
        }
      }
    }

    return this;
  }

  addOperation(operation, args) {
    const shouldAdd = operation.onAdd(this, args);

    if (shouldAdd) {
      this._operations.push(operation);
    }

    return this;
  }

  addOperationToFront(operation, args) {
    const shouldAdd = operation.onAdd(this, args);

    if (shouldAdd) {
      this._operations.unshift(operation);
    }

    return this;
  }

  clone() {
    return this.baseCloneInto(new this.constructor(this.unsafeKnex()));
  }

  baseCloneInto(builder) {
    builder._knex = this._knex;
    builder._operations = this._operations.slice();
    builder._context = this._context.clone();
    builder._parentQuery = this._parentQuery;

    return builder;
  }

  build() {
    return this.buildInto(this.knex().queryBuilder());
  }

  buildInto(knexBuilder) {
    this.executeOnBuild();

    // onBuildKnex operations should never add new operations. They should only call
    // methods on the knex query builder.
    for (let i = 0, l = this._operations.length; i < l; ++i) {
      this._operations[i].onBuildKnex(knexBuilder, this);

      if (this._operations.length !== l) {
        throw new Error('onBuildKnex should only call query building methods on the knex builder');
      }
    }

    return knexBuilder;
  }

  executeOnBuild() {
    const operationSet = new Set();

    for (let i = 0; i < this._operations.length; ++i) {
      operationSet.add(this._operations[i]);
    }

    let i = 0;
    while (i < this._operations.length) {
      const iOp = this._operations[i];
      const newOps = [];

      iOp.onBuild(this);

      for (let j = 0; j < this._operations.length; ++j) {
        const jOp = this._operations[j];

        // onBuild may have removed operations before `op`.
        // We need to update the index.
        if (iOp === jOp) {
          i = j;
        }

        if (!operationSet.has(jOp)) {
          // New operation was added.
          newOps.push(jOp);
          operationSet.add(jOp);
        }
      }

      if (newOps.length !== 0) {
        // Make room for the new operations after the current operation.
        for (let j = this._operations.length - 1; j > i + newOps.length; --j) {
          this._operations[j] = this._operations[j - newOps.length];
        }

        // Move the new operations after the current operation.
        for (let j = 0; j < newOps.length; ++j) {
          this._operations[i + j + 1] = newOps[j];
        }
      }

      ++i;
    }
  }

  toString() {
    return this.build().toString();
  }

  toSql() {
    return this.toString();
  }

  skipUndefined() {
    this._context.options.skipUndefined = true;
    return this;
  }
}

module.exports = QueryBuilderOperationSupport;
