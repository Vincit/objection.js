'use strict';

const Promise = require('bluebird');
const QueryBuilderContext = require('./QueryBuilderContext');
const RelationExpression = require('./RelationExpression');
const QueryBuilderBase = require('./QueryBuilderBase');

const FindOperation = require('./operations/FindOperation');
const DeleteOperation = require('./operations/DeleteOperation');
const UpdateOperation = require('./operations/UpdateOperation');
const InsertOperation = require('./operations/InsertOperation');

const InsertGraphAndFetchOperation = require('./operations/InsertGraphAndFetchOperation');
const InsertAndFetchOperation = require('./operations/InsertAndFetchOperation');
const UpdateAndFetchOperation = require('./operations/UpdateAndFetchOperation');
const QueryBuilderOperation = require('./operations/QueryBuilderOperation');
const JoinRelationOperation = require('./operations/JoinRelationOperation');
const InsertGraphOperation = require('./operations/InsertGraphOperation');
const UpsertGraphOperation = require('./operations/UpsertGraphOperation');
const DeleteByIdOperation = require('./operations/DeleteByIdOperation');
const RunBeforeOperation = require('./operations/RunBeforeOperation');
const RunAfterOperation = require('./operations/RunAfterOperation');
const FindByIdOperation = require('./operations/FindByIdOperation');
const OnBuildOperation = require('./operations/OnBuildOperation');
const SelectOperation = require('./operations/SelectOperation');
const EagerOperation = require('./operations/eager/EagerOperation');
const RangeOperation = require('./operations/RangeOperation');
const FirstOperation = require('./operations/FirstOperation');
const FromOperation = require('./operations/FromOperation');
const KnexOperation = require('./operations/KnexOperation');

class QueryBuilder extends QueryBuilderBase {

  constructor(modelClass) {
    super(modelClass.knex(), QueryBuilderContext);

    this._modelClass = modelClass;
    this._explicitRejectValue = null;
    this._explicitResolveValue = null;

    this._eagerExpression = null;
    this._eagerFilterExpressions = [];
    this._allowedEagerExpression = null;
    this._allowedUpsertExpression = null;

    this._findOperationOptions = {};
    this._eagerOperationOptions = {};

    this._findOperationFactory = findOperationFactory;
    this._insertOperationFactory = insertOperationFactory;
    this._updateOperationFactory = updateOperationFactory;
    this._patchOperationFactory = patchOperationFactory;
    this._relateOperationFactory = relateOperationFactory;
    this._unrelateOperationFactory = unrelateOperationFactory;
    this._deleteOperationFactory = deleteOperationFactory;
    this._eagerOperationFactory = modelClass.defaultEagerAlgorithm;
  }

  static forClass(modelClass) {
    return new this(modelClass);
  }

  get isObjectionQueryBuilder() {
    return true;
  }

  tableNameFor(modelClass, tableName) {
    const ctx = this.internalContext();
    const tableMap = ctx.tableMap;

    if (typeof tableName === 'string') {
      ctx.tableMap = ctx.tableMap || Object.create(null);
      ctx.tableMap[modelClass.tableName] = tableName;
      return this;
    } else {
      return (tableMap && tableMap[modelClass.tableName]) || modelClass.tableName;
    }
  }

  aliasFor(modelClass, alias) {
    const ctx = this.internalContext();
    const aliasMap = ctx.aliasMap;

    if (typeof alias === 'string') {
      ctx.aliasMap = ctx.aliasMap || Object.create(null);
      ctx.aliasMap[modelClass.tableName] = alias;
      return this;
    } else {
      return (aliasMap && aliasMap[modelClass.tableName]) || null;
    }
  }

  alias(alias) {
    return this.aliasFor(this._modelClass, alias);
  }

  tableRefFor(modelClass) {
    return this.aliasFor(modelClass) || this.tableNameFor(modelClass);
  }

  fullIdColumnFor(modelClass) {
    const tableName = this.tableRefFor(modelClass);
    const idColumn = modelClass.idColumn;

    if (Array.isArray(idColumn)) {
      const id = new Array(idColumn.length);

      for (let i = 0, l = idColumn.length; i < l; ++i) {
        id[i] = `${tableName}.${idColumn[i]}`;
      }

      return id;
    } else {
      return `${tableName}.${idColumn}`;
    }
  }

  childQueryOf(query, fork) {
    if (query) {
      let ctx = query.internalContext();

      if (fork) {
        ctx = ctx.clone();
      }

      this.internalContext(ctx);
    }

    return this;
  }

  modify() {
    if (typeof arguments[0] === 'string') {
      const namedFilters = this._modelClass.namedFilters;

      for (let i = 0, l = arguments.length; i < l; ++i) {
        const filter = namedFilters[arguments[i]];
        filter(this);
      }

      return this;
    } else {
      return super.modify.apply(this, arguments);
    }
  }

  reject(error) {
    this._explicitRejectValue = error;
    return this;
  }

  resolve(value) {
    this._explicitResolveValue = value;
    return this;
  }

  isExecutable() {
    const hasExecutor = !!findQueryExecutorOperation(this);
    return !this._explicitRejectValue && !this._explicitResolveValue && !hasExecutor;
  }

  findOperationFactory(factory) {
    this._findOperationFactory = factory;
    return this;
  }

  insertOperationFactory(factory) {
    this._insertOperationFactory = factory;
    return this;
  }

  updateOperationFactory(factory) {
    this._updateOperationFactory = factory;
    return this;
  }

  patchOperationFactory(factory) {
    this._patchOperationFactory = factory;
    return this;
  }

  deleteOperationFactory(factory) {
    this._deleteOperationFactory = factory;
    return this;
  }

  relateOperationFactory(factory) {
    this._relateOperationFactory = factory;
    return this;
  }

  unrelateOperationFactory(factory) {
    this._unrelateOperationFactory = factory;
    return this;
  }

  eagerOperationFactory(factory) {
    if (arguments.length) {
      this._eagerOperationFactory = factory;
      return this;
    } else {
      return this._eagerOperationFactory;
    }
  }

  eagerAlgorithm(algorithm, eagerOptions) {
    this.eagerOperationFactory(algorithm);

    if (eagerOptions) {
      this.eagerOptions(eagerOptions);
    }

    return this;
  }

  eager(exp, filters) {
    this._eagerExpression = exp || null;

    if (typeof this._eagerExpression === 'string') {
      this._eagerExpression = parseRelationExpression(this._modelClass, this._eagerExpression);
    }

    if (filters) {
      this._eagerExpression.filters = filters;
    }

    checkEager(this);
    return this;
  }

  joinEager(exp, filters) {
    return this.eagerAlgorithm(this._modelClass.JoinEagerAlgorithm).eager(exp, filters);
  }

  naiveEager(exp, filters) {
    return this.eagerAlgorithm(this._modelClass.NaiveEagerAlgorithm).eager(exp, filters);
  }

  mergeEager(exp, filters) {
    if (!this._eagerExpression) {
      return this.eager(exp, filters);
    }

    const expr = parseRelationExpression(this._modelClass, exp);

    if (filters) {
      expr.filters = filters;
    }

    this._eagerExpression = this._eagerExpression.merge(expr);

    checkEager(this);
    return this;
  }

  mergeJoinEager(exp, filters) {
    return this.eagerAlgorithm(this._modelClass.JoinEagerAlgorithm).mergeEager(exp, filters);
  }

  mergeNaiveEager(exp, filters) {
    return this.eagerAlgorithm(this._modelClass.NaiveEagerAlgorithm).mergeEager(exp, filters);
  }

  allowEager(exp) {
    this._allowedEagerExpression = exp || null;

    if (typeof this._allowedEagerExpression === 'string') {
      this._allowedEagerExpression = parseRelationExpression(this._modelClass, this._allowedEagerExpression);
    }

    checkEager(this);
    return this;
  }

  modifyEager(path, modifier) {
    this._eagerFilterExpressions.push({
      path: path,
      filter: modifier
    });

    return this;
  }

  filterEager() {
    return this.modifyEager.apply(this, arguments);
  }

  allowUpsert(exp) {
    this._allowedUpsertExpression = exp || null;

    if (typeof this._allowedUpsertExpression === 'string') {
      this._allowedUpsertExpression = parseRelationExpression(this._modelClass, this._allowedUpsertExpression);
    }

    return this;
  }

  allowInsert(exp) {
    return this.allowUpsert(exp);
  }

  eagerOptions(opt) {
    this._eagerOperationOptions = Object.assign({}, this._eagerOperationOptions, opt);
    const opIdx = this.indexOfOperation(EagerOperation);

    if (opIdx !== -1) {
      this._operations[opIdx] = this._operations[opIdx].clone({
        opt: this._eagerOperationOptions
      });
    }

    return this;
  }

  findOptions(opt) {
    this._findOperationOptions = Object.assign({}, this._findOperationOptions, opt);
    const opIdx = this.indexOfOperation(FindOperation);

    if (opIdx !== -1) {
      this._operations[opIdx] = this._operations[opIdx].clone({
        opt: this._findOperationOptions
      });
    }

    return this;
  }

  modelClass() {
    return this._modelClass;
  }

  isFindQuery() {
    return !this._operations.some(method => method.isWriteOperation) && !this._explicitRejectValue;
  }

  isEagerQuery() {
    return !!this._eagerExpression;
  }

  toString() {
    return this.build().toString();
  }

  toSql() {
    return this.toString();
  }

  clone() {
    const builder = new this.constructor(this._modelClass);
    this.baseCloneInto(builder);

    builder._explicitRejectValue = this._explicitRejectValue;
    builder._explicitResolveValue = this._explicitResolveValue;

    builder._eagerExpression = this._eagerExpression;
    builder._eagerFilterExpressions = this._eagerFilterExpressions.slice();

    builder._allowedEagerExpression = this._allowedEagerExpression;
    builder._allowedUpsertExpression = this._allowedUpsertExpression;

    builder._findOperationOptions = this._findOperationOptions;
    builder._eagerOperationOptions = this._eagerOperationOptions;

    builder._findOperationFactory = this._findOperationFactory;
    builder._insertOperationFactory = this._insertOperationFactory;
    builder._updateOperationFactory = this._updateOperationFactory;
    builder._patchOperationFactory = this._patchOperationFactory;
    builder._relateOperationFactory = this._relateOperationFactory;
    builder._unrelateOperationFactory = this._unrelateOperationFactory;
    builder._deleteOperationFactory = this._deleteOperationFactory;
    builder._eagerOperationFactory = this._eagerOperationFactory;

    return builder;
  }

  clearEager() {
    this._eagerExpression = null;
    this._eagerFilterExpressions = [];
    return this;
  }

  clearReject() {
    this._explicitRejectValue = null;
    return this;
  }

  clearResolve() {
    this._explicitResolveValue = null;
    return this;
  }

  then(successHandler, errorHandler) {
    const promise = this.execute();
    return promise.then.apply(promise, arguments);
  }

  map(mapper) {
    const promise = this.execute();
    return promise.map.apply(promise, arguments);
  }

  catch(errorHandler) {
    const promise = this.execute();
    return promise.catch.apply(promise, arguments);
  }

  return(returnValue) {
    const promise = this.execute();
    return promise.return.apply(promise, arguments);
  }

  bind(context) {
    const promise = this.execute();
    return promise.bind.apply(promise, arguments);
  }

  asCallback(callback) {
    const promise = this.execute();
    return promise.asCallback.apply(promise, arguments);
  }

  nodeify(callback) {
    const promise = this.execute();
    return promise.nodeify.apply(promise, arguments);
  }

  resultSize() {
    const knex = this.knex();
    const builder = this.clone().clear(/orderBy|offset|limit/);

    const countQuery = knex.count('* as count').from(knexBuilder => {
      builder.build(knexBuilder).as('temp');
    });

    if (this.internalOptions().debug) {
      countQuery.debug();
    }

    return countQuery.then(result => result[0] ? result[0].count : 0);
  }

  build(knexBuilder) {
    // Take a clone so that we don't modify this instance during build.
    const builder = this.clone();

    if (builder.isFindQuery()) {
      // If no write operations have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      callFindOperation(builder);
    }

    if (builder.isEagerQuery()) {
      callEagerFetchOperation(builder);
    }

    // We need to build the builder even if a query executor operation
    // has been called so that the onBuild hooks get called.
    knexBuilder = buildInto(builder, knexBuilder || builder.knex().queryBuilder());

    const queryExecutorOperation = findQueryExecutorOperation(builder);

    if (queryExecutorOperation) {
      // If the query executor is set, we build the builder that it returns.
      return queryExecutorOperation.queryExecutor(builder).build();
    } else {
      return knexBuilder;
    }
  }

  execute() {
    // Take a clone so that we don't modify this instance during execution.
    let builder = this.clone();
    let promiseCtx = {builder};
    let promise = Promise.bind(promiseCtx);
    let context = builder.context() || {};
    let internalContext = builder.internalContext();

    if (builder.isFindQuery()) {
      // If no write operations have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      callFindOperation(builder);
    }

    if (builder.isEagerQuery()) {
      callEagerFetchOperation(builder);
    }

    promise = chainBefore1Operations(promise, builder._operations);
    promise = chainHooks(promise, context.runBefore);
    promise = chainHooks(promise, internalContext.runBefore);

    promise = chainBefore2Operations(promise, builder._operations);
    promise = chainBefore3Operations(promise, builder._operations);

    // Resolve all before hooks before building and executing the query
    // and the rest of the hooks.
    return promise.then(function () {
      const promiseCtx = this;
      const builder = promiseCtx.builder;

      let promise = null;
      let knexBuilder = buildInto(builder, builder.knex().queryBuilder());
      let queryExecutorOperation = findQueryExecutorOperation(builder);

      if (builder._explicitRejectValue) {
        promise  = Promise.reject(builder._explicitRejectValue).bind(promiseCtx);
      } else if (builder._explicitResolveValue) {
        promise = Promise.resolve(builder._explicitResolveValue).bind(promiseCtx);
      } else if (queryExecutorOperation) {
        promise = queryExecutorOperation.queryExecutor(builder).bind(promiseCtx);
      } else {
        promise = knexBuilder.bind(promiseCtx);
        promise = chainRawResultOperations(promise, builder._operations);
        promise = promise.then(createModels);
      }

      promise = chainAfter1Operations(promise, builder._operations);
      promise = chainAfter2Operations(promise, builder._operations);

      promise = chainHooks(promise, context.runAfter);
      promise = chainHooks(promise, internalContext.runAfter);
      promise = chainAfter3Operations(promise, builder._operations);

      return promise;
    });
  }

  pluck(propertyName) {
    return this.runAfter(result => {
      if (Array.isArray(result)) {
        return result.map(it => it && it[propertyName]);
      } else {
        return result;
      }
    });
  }

  throwIfNotFound() {
    return this.runAfter((result, builder) => {
      if (Array.isArray(result) && result.length === 0) {
        throw this._modelClass.createNotFoundError(builder.context());
      } else if (result === null || result === undefined || result === 0) {
        throw this._modelClass.createNotFoundError(builder.context());
      } else {
        return result;
      }
    });
  }

  findSelection(selection, explicit) {
    explicit = (explicit == null) ? false : explicit;

    const table = this.tableRefFor(this._modelClass);
    let noSelectStatements = true;

    for (let i = 0, l = this._operations.length; i < l; ++i) {
      const op = this._operations[i];

      if (op.constructor === SelectOperation) {
        const selectionObj = op.findSelection(table, selection);
        noSelectStatements = false;

        if (selectionObj) {
          return selectionObj;
        }
      }
    }

    if (noSelectStatements && !explicit) {
      return SelectOperation.Selection.SelectAll;
    } else {
      return null;
    }
  }

  hasSelection(selection, explicit) {
    return this.findSelection(selection, explicit) !== null;
  }

  hasSelectionAs(selection, alias, explicit) {
    const select = this.findSelection(selection, explicit);
    return select !== null && (select.column === '*' || select.name === alias);
  }

  traverse(modelClass, traverser) {
    if (typeof traverser === 'undefined') {
      traverser = modelClass;
      modelClass = null;
    }

    return this.runAfter(result => {
      this._modelClass.traverse(modelClass, result, traverser);
      return result;
    });
  }

  pick(modelClass, properties) {
    if (typeof properties === 'undefined') {
      properties = modelClass;
      modelClass = null;
    }

    // Turn the properties into a hash for performance.
    properties = properties.reduce((obj, prop) => {
      obj[prop] = true;
      return obj;
    }, {});

    return this.traverse(modelClass, model => {
      model.$pick(properties);
    });
  }

  omit(modelClass, properties) {
    if (typeof properties === 'undefined') {
      properties = modelClass;
      modelClass = null;
    }

    // Turn the properties into a hash for performance.
    properties = properties.reduce((obj, prop) => {
      obj[prop] = true;
      return obj;
    }, {});

    return this.traverse(modelClass, model => {
      model.$omit(properties);
    });
  }

  page(page, pageSize) {
    return this.range(page * pageSize, (page + 1) * pageSize - 1);
  }

  withSchema(schema) {
    this.internalContext().onBuild.push(builder => {
      if (!builder.has(/withSchema/)) {
        // Need to push this operation to the front because knex doesn't use the
        // schema for operations called before `withSchema`.
        builder.addOperationToFront(
          new KnexOperation('withSchema'),
          [schema]
        );
      }
    });

    return this;
  }

  debug() {
    this.internalOptions().debug = true;
    this.internalContext().onBuild.push(builder => {
      builder.addOperation(
        new KnexOperation('debug'),
        []
      );
    });

    return this;
  }

  insert(modelsOrObjects) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      this.addOperation(insertOperation, [modelsOrObjects]);
    });
  }

  insertAndFetch(modelsOrObjects) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      const insertAndFetchOperation = new InsertAndFetchOperation('insertAndFetch', {
        delegate: insertOperation
      });

      this.addOperation(insertAndFetchOperation, [modelsOrObjects]);
    });
  }

  insertGraph(modelsOrObjects) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      const insertGraphOperation = new InsertGraphOperation('insertGraph', {
        delegate: insertOperation
      });

      this.addOperation(insertGraphOperation, [modelsOrObjects]);
    });
  }

  insertWithRelated() {
    return this.insertGraph.apply(this, arguments);
  }

  insertGraphAndFetch(modelsOrObjects) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      const insertGraphOperation = new InsertGraphOperation('insertGraph', {
        delegate: insertOperation
      });

      const insertGraphAndFetchOperation = new InsertGraphAndFetchOperation('insertGraphAndFetch', {
        delegate: insertGraphOperation
      });

      return this.addOperation(insertGraphAndFetchOperation, [modelsOrObjects]);
    });
  }

  insertWithRelatedAndFetch() {
    return this.insertGraphAndFetch.apply(this, arguments);
  }

  update(modelOrObject) {
    return writeOperation(this, () => {
      const updateOperation = this._updateOperationFactory(this);

      this.addOperation(updateOperation, [modelOrObject]);
    });
  }

  updateAndFetch(modelOrObject) {
    return writeOperation(this, () => {
      const updateOperation = this._updateOperationFactory(this);

      if (!(updateOperation.instance instanceof this._modelClass)) {
        throw new Error('updateAndFetch can only be called for instance operations');
      }

      const updateAndFetch = new UpdateAndFetchOperation('updateAndFetch', {
        delegate: updateOperation
      });

      // patchOperation is an instance update operation that already adds the
      // required "where id = $" clause.
      updateAndFetch.skipIdWhere = true;

      this.addOperation(updateAndFetch, [updateOperation.instance.$id(), modelOrObject]);
    });
  }

  updateAndFetchById(id, modelOrObject) {
    return writeOperation(this, () => {
      const updateOperation = this._updateOperationFactory(this);

      const updateAndFetch = new UpdateAndFetchOperation('updateAndFetch', {
        delegate: updateOperation
      });

      this.addOperation(updateAndFetch, [id, modelOrObject]);
    });
  }

  patch(modelOrObject) {
    return writeOperation(this, () => {
      const patchOperation = this._patchOperationFactory(this);

      this.addOperation(patchOperation, [modelOrObject]);
    });
  }

  upsertGraph(modelsOrObjects, opt) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      const upsertGraphOperation = new UpsertGraphOperation('upsertGraph', {
        delegate: insertOperation,
        opt
      });

      this.addOperation(upsertGraphOperation, [modelsOrObjects]);
    });
  }

  patchAndFetch(modelOrObject) {
    return writeOperation(this, () => {
      const patchOperation = this._patchOperationFactory(this);

      if (!(patchOperation.instance instanceof this._modelClass)) {
        throw new Error('patchAndFetch can only be called for instance operations');
      }

      const patchAndFetch = new UpdateAndFetchOperation('patchAndFetch', {
        delegate: patchOperation
      });

      // patchOperation is an instance update operation that already adds the
      // required "where id = $" clause.
      patchAndFetch.skipIdWhere = true;

      this.addOperation(patchAndFetch, [patchOperation.instance.$id(), modelOrObject]);
    });
  }

  patchAndFetchById(id, modelOrObject) {
    return writeOperation(this, () => {
      const patchOperation = this._patchOperationFactory(this);

      const patchAndFetch = new UpdateAndFetchOperation('patchAndFetch', {
        delegate: patchOperation
      });

      this.addOperation(patchAndFetch, [id, modelOrObject]);
    });
  }

  delete() {
    return writeOperation(this, () => {
      if (arguments.length) {
        throw new Error(`Don't pass arguments to delete(). You should use it like this: delete().where('foo', 'bar').andWhere(...)`);
      }

      const deleteOperation = this._deleteOperationFactory(this);
      this.addOperation(deleteOperation, arguments);
    });
  }

  del() {
    return this.delete.apply(this, arguments);
  }

  relate() {
    return writeOperation(this, () => {
      const relateOperation = this._relateOperationFactory(this);

      this.addOperation(relateOperation, arguments);
    });
  }

  unrelate() {
    return writeOperation(this, () => {
      if (arguments.length) {
        throw new Error(`Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`);
      }

      const unrelateOperation = this._unrelateOperationFactory(this);
      this.addOperation(unrelateOperation, arguments);
    });
  }

  increment(propertyName, howMuch) {
    const columnName = this.modelClass().propertyNameToColumnName(propertyName);

    return this.patch({
      [columnName]: this.knex().raw('?? + ?', [columnName, howMuch])
    });
  }

  decrement(propertyName, howMuch) {
    const columnName = this.modelClass().propertyNameToColumnName(propertyName);

    return this.patch({
      [columnName]: this.knex().raw('?? - ?', [columnName, howMuch])
    });
  }

  findOne() {
    return this.where.apply(this, arguments).first();
  }

  range() {
    return this.addOperation(
      new RangeOperation('range'),
      arguments
    );
  }

  first() {
    return this.addOperation(
      new FirstOperation('first'),
      arguments
    );
  }

  joinRelation() {
    return this.addOperation(
      new JoinRelationOperation('joinRelation', {joinOperation: 'join'}),
      arguments
    );
  }

  innerJoinRelation() {
    return this.addOperation(
      new JoinRelationOperation('innerJoinRelation', {joinOperation: 'innerJoin'}),
      arguments
    );
  }

  outerJoinRelation(relationName) {
    return this.addOperation(
      new JoinRelationOperation('outerJoinRelation', {joinOperation: 'outerJoin'}),
      arguments
    );
  }

  leftJoinRelation(relationName) {
    return this.addOperation(
      new JoinRelationOperation('leftJoinRelation', {joinOperation: 'leftJoin'}),
      arguments
    );
  }

  leftOuterJoinRelation(relationName) {
    return this.addOperation(
      new JoinRelationOperation('leftOuterJoinRelation', {joinOperation: 'leftOuterJoin'}),
      arguments
    );
  }

  rightJoinRelation(relationName) {
    return this.addOperation(
      new JoinRelationOperation('rightJoinRelation', {joinOperation: 'rightJoin'}),
      arguments
    );
  }

  rightOuterJoinRelation(relationName) {
    return this.addOperation(
      new JoinRelationOperation('rightOuterJoinRelation', {joinOperation: 'rightOuterJoin'}),
      arguments
    );
  }

  fullOuterJoinRelation(relationName) {
    return this.addOperation(
      new JoinRelationOperation('fullOuterJoinRelation', {joinOperation: 'fullOuterJoin'}),
      arguments
    );
  }

  deleteById() {
    return this.addOperation(
      new DeleteByIdOperation('deleteById'),
      arguments
    );
  }

  findById() {
    return this.addOperation(
      new FindByIdOperation('findById'),
      arguments
    );
  }

  runBefore() {
    return this.addOperation(
      new RunBeforeOperation('runBefore'),
      arguments
    );
  }

  onBuild() {
    return this.addOperation(
      new OnBuildOperation('onBuild'),
      arguments
    );
  }

  runAfter() {
    return this.addOperation(
      new RunAfterOperation('runAfter'),
      arguments
    );
  }

  from() {
    return this.addOperation(
      new FromOperation('from'),
      arguments
    );
  }

  table() {
    return this.addOperation(
      new FromOperation('table'),
      arguments
    );
  }
}

function parseRelationExpression(modelClass, expr) {
  try {
    return RelationExpression.parse(expr);
  } catch (err) {
    throw modelClass.createValidationError({
      message: 'Invalid relation expression "' + expr + '"',
      cause: err.message
    });
  }
}

function checkEager(builder) {
  const expr = builder._eagerExpression;
  const allowedExpr = builder._allowedEagerExpression;

  if (expr && allowedExpr && !allowedExpr.isSubExpression(expr)) {
    const modelClass = builder.modelClass();

    builder.reject(modelClass.createValidationError({
      eager: 'eager expression not allowed'
    }));
  }
}

function findQueryExecutorOperation(builder) {
  for (let i = 0, l = builder._operations.length; i < l; ++i) {
    const op = builder._operations[i];

    if (op.hasQueryExecutor()) {
      return op;
    }
  }

  return null;
}

function callFindOperation(builder) {
  if (!builder.has(FindOperation)) {
    const operation = builder._findOperationFactory(builder);

    operation.opt = Object.assign(operation.opt,
      builder._findOperationOptions
    );

    builder.addOperationToFront(operation, []);
  }
}

function callEagerFetchOperation(builder) {
  if (!builder.has(EagerOperation) && builder._eagerExpression) {
    const operation = builder._eagerOperationFactory(builder);

    operation.opt = Object.assign(operation.opt,
      builder._modelClass.defaultEagerOptions,
      builder._eagerOperationOptions
    );

    builder.addOperation(operation, [
      builder._eagerExpression,
      builder._eagerFilterExpressions
    ]);
  }
}

function createModels(result) {
  const builder = this.builder;

  if (result === null || result === undefined) {
    return null;
  }

  if (Array.isArray(result)) {
    if (result.length && shouldBeConvertedToModel(result[0], builder)) {
      for (let i = 0, l = result.length; i < l; ++i) {
        result[i] = builder._modelClass.fromDatabaseJson(result[i]);
      }
    }
  } else if (shouldBeConvertedToModel(result, builder)) {
    result = builder._modelClass.fromDatabaseJson(result);
  }

  return result;
}

function shouldBeConvertedToModel(obj, builder) {
  return typeof obj === 'object' && !(obj instanceof builder._modelClass);
}

function writeOperation(builder, cb) {
  if (!builder.isFindQuery()) {
    return builder.reject(new Error('Double call to a write method. ' +
      'You can only call one of the write methods ' +
      '(insert, update, patch, delete, relate, unrelate, increment, decrement) ' +
      'and only once per query builder.'));
  }

  try {
    cb();
    return builder;
  } catch (err) {
    return builder.reject(err);
  }
}

function buildInto(builder, knexBuilder) {
  const context = builder.context() || {};
  const internalContext = builder.internalContext();

  callOnBuildHooks(builder, context.onBuild);
  callOnBuildHooks(builder, internalContext.onBuild);

  knexBuilder = builder.buildInto(knexBuilder);

  const fromOperation = builder.findLastOperation(QueryBuilderBase.FromSelector);
  const hasSelects = builder.has(QueryBuilderBase.SelectSelector);

  // Set the table only if it hasn't been explicitly set yet.
  if (!fromOperation) {
    setDefaultTable(builder, knexBuilder);
  }

  // Only add `table.*` select if there are no explicit selects
  // and `from` is a table name and not a subquery.
  if (!hasSelects && (!fromOperation || fromOperation.table)) {
    setDefaultSelect(builder, knexBuilder);
  }

  return knexBuilder;
}

function setDefaultTable(builder, knexBuilder) {
  const table = builder.tableNameFor(builder.modelClass());
  const tableRef = builder.tableRefFor(builder.modelClass());

  if (table === tableRef) {
    knexBuilder.table(table);
  } else {
    knexBuilder.table(`${table} as ${tableRef}`);
  }
}

function setDefaultSelect(builder, knexBuilder) {
  const tableRef = builder.tableRefFor(builder.modelClass());

  knexBuilder.select(`${tableRef}.*`);
}

function chainHooks(promise, func) {
  if (typeof func === 'function') {
    promise = promise.then(function (result) {
      return func.call(this.builder, result, this.builder);
    });
  } else if (Array.isArray(func)) {
    func.forEach(func => {
      promise = promise.then(function (result) {
        return func.call(this.builder, result, this.builder);
      });
    });
  }

  return promise;
}

function callOnBuildHooks(builder, func) {
  if (typeof func === 'function') {
    func.call(builder, builder);
  } else if (Array.isArray(func)) {
    for (let i = 0, l = func.length; i < l; ++i) {
      func[i].call(builder, builder);
    }
  }
}

function createHookCaller(hook) {
  const hasMethod = 'has' + hook.charAt(0).toUpperCase() + hook.substr(1);

  return (promise, operations) => {
    for (let i = 0, l = operations.length; i < l; ++i) {
      const op = operations[i];

      if (op[hasMethod]()) {
        promise = promise.then(function (result) {
          return op[hook](this.builder, result);
        });
      }
    }

    return promise;
  };
}

function createOperationFactory(OperationClass, name, options) {
  return () => {
    return new OperationClass(name, options);
  };
}

const chainBefore1Operations = createHookCaller('onBefore1');
const chainBefore2Operations = createHookCaller('onBefore2');
const chainBefore3Operations = createHookCaller('onBefore3');
const chainRawResultOperations = createHookCaller('onRawResult');
const chainAfter1Operations = createHookCaller('onAfter1');
const chainAfter2Operations = createHookCaller('onAfter2');
const chainAfter3Operations = createHookCaller('onAfter3');

const findOperationFactory = createOperationFactory(FindOperation, 'find');
const insertOperationFactory = createOperationFactory(InsertOperation, 'insert');
const updateOperationFactory = createOperationFactory(UpdateOperation, 'update');
const patchOperationFactory = createOperationFactory(UpdateOperation, 'patch', {modelOptions: {patch: true}});
const relateOperationFactory = createOperationFactory(QueryBuilderOperation, 'relate');
const unrelateOperationFactory = createOperationFactory(QueryBuilderOperation, 'unrelate');
const deleteOperationFactory = createOperationFactory(DeleteOperation, 'delete');

module.exports = QueryBuilder;
