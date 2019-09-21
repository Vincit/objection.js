'use strict';

const promiseUtils = require('../utils/promiseUtils');

const { isString, isFunction, isRegExp, last } = require('../utils/objectUtils');
const { QueryBuilderContextBase } = require('./QueryBuilderContextBase');
const { QueryBuilderUserContext } = require('./QueryBuilderUserContext');

const AllSelector = () => true;
const SelectSelector = /^(select|columns|column|distinct|count|countDistinct|min|max|sum|sumDistinct|avg|avgDistinct)$/;
const WhereSelector = /^(where|orWhere|andWhere|find)/;
const OnSelector = /^(on|orOn|andOn)/;
const OrderBySelector = /orderBy/;
const JoinSelector = /(join|joinRaw|joinRelation)$/i;
const FromSelector = /^(from|into|table)$/;

class QueryBuilderOperationSupport {
  constructor(...args) {
    this.constructor.init(this, ...args);
  }

  static init(self, modelClass) {
    self._modelClass = modelClass;
    self._operations = [];
    self._context = new this.QueryBuilderContext(self);
    self._parentQuery = null;
    self._isPartialQuery = false;
    self._activeOperations = [];
  }

  static forClass(modelClass) {
    return new this(modelClass);
  }

  static get AllSelector() {
    return AllSelector;
  }

  static get QueryBuilderContext() {
    return QueryBuilderContextBase;
  }

  static get QueryBuilderUserContext() {
    return QueryBuilderUserContext;
  }

  static get SelectSelector() {
    return SelectSelector;
  }

  static get WhereSelector() {
    return WhereSelector;
  }

  static get OnSelector() {
    return OnSelector;
  }

  static get JoinSelector() {
    return JoinSelector;
  }

  static get FromSelector() {
    return FromSelector;
  }

  static get OrderBySelector() {
    return OrderBySelector;
  }

  modelClass() {
    return this._modelClass;
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

  isPartial(isPartial) {
    if (arguments.length === 0) {
      return this._isPartialQuery;
    } else {
      this._isPartialQuery = isPartial;
      return this;
    }
  }

  isInternal() {
    return this.internalOptions().isInternalQuery;
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

  childQueryOf(query, { fork, isInternalQuery } = {}) {
    if (query) {
      let ctx = query.internalContext();

      if (fork) {
        ctx = ctx.clone();
      }

      if (isInternalQuery) {
        ctx.options.isInternalQuery = true;
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
    if (query) {
      this._parentQuery = query;

      if (this.unsafeKnex() === null) {
        this.knex(query.unsafeKnex());
      }
    }

    return this;
  }

  parentQuery() {
    return this._parentQuery;
  }

  knex(...args) {
    if (args.length === 0) {
      const knex = this.unsafeKnex();

      if (!knex) {
        throw new Error(
          `no database connection available for a query. You need to bind the model class or the query to a knex instance.`
        );
      }

      return knex;
    } else {
      this._context.knex = args[0];
      return this;
    }
  }

  unsafeKnex() {
    return this._context.knex || this._modelClass.knex() || null;
  }

  clear(operationSelector) {
    const operationsToRemove = new Set();

    this.forEachOperation(operationSelector, op => {
      // If an ancestor operation has already been removed,
      // there's no need to remove the children anymore.
      if (!op.isAncestorInSet(operationsToRemove)) {
        operationsToRemove.add(op);
      }
    });

    for (const op of operationsToRemove) {
      this.removeOperation(op);
    }

    return this;
  }

  clearSelect() {
    return this.clear(SelectSelector);
  }

  clearWhere() {
    return this.clear(WhereSelector);
  }

  clearOrder() {
    return this.clear(OrderBySelector);
  }

  copyFrom(queryBuilder, operationSelector) {
    const operationsToAdd = new Set();

    queryBuilder.forEachOperation(operationSelector, op => {
      // If an ancestor operation has already been added,
      // there is no need to add
      if (!op.isAncestorInSet(operationsToAdd)) {
        operationsToAdd.add(op);
      }
    });

    for (const op of operationsToAdd) {
      const opClone = op.clone();

      // We may be moving nested operations to the root. Clear
      // any links to the parent operations.
      opClone.parentOperation = null;
      opClone.adderHookName = null;

      // We don't use `addOperation` here because we don't what to
      // call `onAdd` or add these operations as child operations.
      this._operations.push(opClone);
    }

    return this;
  }

  has(operationSelector) {
    return !!this.findOperation(operationSelector);
  }

  forEachOperation(operationSelector, callback, match = true) {
    const selector = buildFunctionForOperationSelector(operationSelector);

    for (const op of this._operations) {
      if (selector(op) === match && callback(op) === false) {
        break;
      }

      const childRes = op.forEachDescendantOperation(op => {
        if (selector(op) === match && callback(op) === false) {
          return false;
        }
      });

      if (childRes === false) {
        break;
      }
    }

    return this;
  }

  findOperation(operationSelector) {
    let op = null;

    this.forEachOperation(operationSelector, it => {
      op = it;
      return false;
    });

    return op;
  }

  findLastOperation(operationSelector) {
    let op = null;

    this.forEachOperation(operationSelector, it => {
      op = it;
    });

    return op;
  }

  everyOperation(operationSelector) {
    let every = true;

    this.forEachOperation(
      operationSelector,
      () => {
        every = false;
        return false;
      },
      false
    );

    return every;
  }

  callOperationMethod(operation, hookName, args) {
    try {
      operation.removeChildOperationsByHookName(hookName);

      this._activeOperations.push({
        operation,
        hookName
      });

      return operation[hookName](...args);
    } finally {
      this._activeOperations.pop();
    }
  }

  callAsyncOperationMethod(operation, hookName, args) {
    operation.removeChildOperationsByHookName(hookName);

    this._activeOperations.push({
      operation,
      hookName
    });

    return promiseUtils
      .try(() => operation[hookName](...args))
      .then(result => {
        this._activeOperations.pop();
        return result;
      })
      .catch(err => {
        this._activeOperations.pop();
        return Promise.reject(err);
      });
  }

  addOperation(operation, args) {
    const ret = this.addOperationUsingMethod('push', operation, args);
    return ret;
  }

  addOperationToFront(operation, args) {
    return this.addOperationUsingMethod('unshift', operation, args);
  }

  addOperationUsingMethod(arrayMethod, operation, args) {
    const shouldAdd = this.callOperationMethod(operation, 'onAdd', [this, args]);

    if (shouldAdd) {
      if (this._activeOperations.length) {
        const { operation: parentOperation, hookName } = last(this._activeOperations);
        parentOperation.addChildOperation(hookName, operation);
      } else {
        this._operations[arrayMethod](operation);
      }
    }

    return this;
  }

  removeOperation(operation) {
    if (operation.parentOperation) {
      operation.parentOperation.removeChildOperation(operation);
    } else {
      const index = this._operations.indexOf(operation);

      if (index !== -1) {
        this._operations.splice(index, 1);
      }
    }

    return this;
  }

  clone() {
    return this.baseCloneInto(new this.constructor(this.unsafeKnex()));
  }

  baseCloneInto(builder) {
    builder._modelClass = this._modelClass;
    builder._operations = this._operations.map(it => it.clone());
    builder._context = this._context.clone();
    builder._parentQuery = this._parentQuery;
    builder._isPartialQuery = this._isPartialQuery;

    // Don't copy the active operation stack. We never continue (nor can we)
    // a query from the exact mid-hook-call state.
    builder._activeOperations = [];

    return builder;
  }

  toKnexQuery(knexBuilder = this.knex().queryBuilder()) {
    this.executeOnBuild();
    this.executeOnBuildKnex(knexBuilder);

    return knexBuilder;
  }

  executeOnBuild() {
    this.forEachOperation(true, op => {
      if (op.hasOnBuild()) {
        this.callOperationMethod(op, 'onBuild', [this]);
      }
    });
  }

  executeOnBuildKnex(knexBuilder) {
    this.forEachOperation(true, op => {
      if (op.hasOnBuildKnex()) {
        this.callOperationMethod(op, 'onBuildKnex', [knexBuilder, this]);
      }
    });
  }

  toString() {
    return this.toKnexQuery().toString();
  }

  toSql() {
    return this.toString();
  }

  skipUndefined() {
    this.internalOptions().skipUndefined = true;
    return this;
  }
}

function buildFunctionForOperationSelector(operationSelector) {
  if (operationSelector === true) {
    return AllSelector;
  } else if (isRegExp(operationSelector)) {
    return op => operationSelector.test(op.name);
  } else if (isString(operationSelector)) {
    return op => op.name === operationSelector;
  } else if (
    isFunction(operationSelector) &&
    operationSelector.isObjectionQueryBuilderOperationClass
  ) {
    return op => op.is(operationSelector);
  } else if (isFunction(operationSelector)) {
    return operationSelector;
  } else {
    return () => false;
  }
}

module.exports = {
  QueryBuilderOperationSupport
};
