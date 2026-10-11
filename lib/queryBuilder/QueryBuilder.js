'use strict';

const { wrapDbError } = require('../utils/wrapDbError');

const { raw } = require('./RawBuilder');
const { createModifier } = require('../utils/createModifier');
const { ValidationErrorType } = require('../model/ValidationError');
const { isObject, isString, isFunction, last, flatten } = require('../utils/objectUtils');
const { RelationExpression, DuplicateRelationError } = require('./RelationExpression');
const { assertIdNotUndefined, assertHasIdColumn } = require('../utils/assert');

const { Selection } = require('./operations/select/Selection');

const { QueryBuilderContext } = require('./QueryBuilderContext');
const { QueryBuilderBase } = require('./QueryBuilderBase');

const { FindOperation } = require('./operations/FindOperation');
const { DeleteOperation } = require('./operations/DeleteOperation');
const { UpdateOperation } = require('./operations/UpdateOperation');
const { InsertOperation } = require('./operations/InsertOperation');
const { RelateOperation } = require('./operations/RelateOperation');
const { UnrelateOperation } = require('./operations/UnrelateOperation');

const { JoinEagerOperation } = require('./operations/eager/JoinEagerOperation');
const { NaiveEagerOperation } = require('./operations/eager/NaiveEagerOperation');
const { WhereInEagerOperation } = require('./operations/eager/WhereInEagerOperation');

const { InsertGraphAndFetchOperation } = require('./operations/InsertGraphAndFetchOperation');
const { UpsertGraphAndFetchOperation } = require('./operations/UpsertGraphAndFetchOperation');
const { InsertAndFetchOperation } = require('./operations/InsertAndFetchOperation');
const { UpdateAndFetchOperation } = require('./operations/UpdateAndFetchOperation');
const { JoinRelatedOperation } = require('./operations/JoinRelatedOperation');
const { OnBuildKnexOperation } = require('./operations/OnBuildKnexOperation');
const { InsertGraphOperation } = require('./operations/InsertGraphOperation');
const { UpsertGraphOperation } = require('./operations/UpsertGraphOperation');
const { RunBeforeOperation } = require('./operations/RunBeforeOperation');
const { RunAfterOperation } = require('./operations/RunAfterOperation');
const { FindByIdOperation } = require('./operations/FindByIdOperation');
const { FindByIdsOperation } = require('./operations/FindByIdsOperation');
const { OnBuildOperation } = require('./operations/OnBuildOperation');
const { OnErrorOperation } = require('./operations/OnErrorOperation');
const { SelectOperation } = require('./operations/select/SelectOperation');
const { EagerOperation } = require('./operations/eager/EagerOperation');
const { RangeOperation } = require('./operations/RangeOperation');
const { FirstOperation } = require('./operations/FirstOperation');
const { NoneOperation } = require('./operations/NoneOperation');
const { FromOperation } = require('./operations/FromOperation');
const { KnexOperation } = require('./operations/KnexOperation');
const { wrapWhereGroups } = require('./whereGroups');

class QueryBuilder extends QueryBuilderBase {
  static init(self, modelClass) {
    super.init(self, modelClass);

    self._resultModelClass = null;
    self._explicitRejectValue = null;
    self._explicitResolveValue = null;
    self._modifiers = {};

    self._allowedGraphExpression = null;
    self._graphModifiersAtPath = [];
    // The eager algorithm that was most recently used explicitly, see `withGraph()`.
    self._graphAlgorithm = null;
    self._isJoinChildQuery = false;
    self._findOperationOptions = modelClass.defaultFindOptions;
    self._relatedQueryFor = null;
    self._internalSelections = new Set();

    self._findOperationFactory = findOperationFactory;
    self._insertOperationFactory = insertOperationFactory;
    self._updateOperationFactory = updateOperationFactory;
    self._patchOperationFactory = patchOperationFactory;
    self._relateOperationFactory = relateOperationFactory;
    self._unrelateOperationFactory = unrelateOperationFactory;
    self._deleteOperationFactory = deleteOperationFactory;
  }

  static get QueryBuilderContext() {
    return QueryBuilderContext;
  }

  static parseRelationExpression(expr) {
    return RelationExpression.create(expr).toPojo();
  }

  childQueryOf(query, options = {}) {
    super.childQueryOf(query, options);

    if (query) {
      this._isJoinChildQuery = !!options.isJoinChildQuery;

      if (query.isObjectionQueryBuilder) {
        this._graphAlgorithm = query._graphAlgorithm;
      }
    }

    return this;
  }

  // Returns true if this query was created for a relation that is loaded using
  // `withGraphJoined()`. Such queries are only used to build the join and are
  // never executed themselves.
  isJoinChildQuery() {
    return this._isJoinChildQuery;
  }

  tableNameFor(modelClassOrTableName, newTableName) {
    return super.tableNameFor(getTableName(modelClassOrTableName), newTableName);
  }

  tableName(newTableName) {
    return this.tableNameFor(this.modelClass().getTableName(), newTableName);
  }

  tableRef() {
    return this.tableRefFor(this.modelClass().getTableName());
  }

  aliasFor(modelClassOrTableName, alias) {
    return super.aliasFor(getTableName(modelClassOrTableName), alias);
  }

  alias(alias) {
    return this.aliasFor(this.modelClass().getTableName(), alias);
  }

  fullIdColumnFor(modelClass) {
    assertHasIdColumn(modelClass);

    const tableName = this.tableRefFor(modelClass);
    const idColumn = modelClass.getIdColumn();

    if (Array.isArray(idColumn)) {
      return idColumn.map((col) => `${tableName}.${col}`);
    } else {
      return `${tableName}.${idColumn}`;
    }
  }

  fullIdColumn() {
    return this.fullIdColumnFor(this.modelClass());
  }

  modifiers(modifiers) {
    if (arguments.length === 0) {
      return { ...this._modifiers };
    } else {
      this._modifiers = { ...this._modifiers, ...modifiers };
      return this;
    }
  }

  modify(modifier, ...args) {
    if (!modifier) {
      return this;
    }

    modifier = createModifier({
      modifier,
      modelClass: this.modelClass(),
      modifiers: this._modifiers,
    });

    modifier(this, ...args);
    return this;
  }

  reject(error) {
    this._explicitRejectValue = error;
    return this;
  }

  resolve(value) {
    this._explicitResolveValue = value;
    return this;
  }

  isExplicitlyResolvedOrRejected() {
    return this._explicitRejectValue !== null || this._explicitResolveValue !== null;
  }

  isExecutable() {
    return !this.isExplicitlyResolvedOrRejected() && !findQueryExecutorOperation(this);
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

  withGraphFetched(exp, options = {}) {
    return this._withGraphUsing(exp, options, getWhereInEagerAlgorithm(this));
  }

  withGraphJoined(exp, options = {}) {
    return this._withGraphUsing(exp, options, getJoinEagerAlgorithm(this));
  }

  // Like `withGraphFetched()` or `withGraphJoined()` with `options.algorithm`
  // set to 'fetch' or 'join'. Without it, the top-level relations that are
  // already loaded by one of the algorithms are merged into it, and new ones
  // use the most recently used algorithm.
  withGraph(exp, { algorithm, ...options } = {}) {
    if (algorithm !== undefined) {
      return this._withGraphUsing(exp, options, getEagerAlgorithmByName(this, algorithm));
    }

    const parsedExp = parseRelationExpression(this.modelClass(), exp);

    for (const [algorithm, groupExp] of groupByEagerAlgorithm(this, parsedExp)) {
      this._withGraph(groupExp, options, algorithm);
    }

    return this;
  }

  _withGraphUsing(exp, options, algorithm) {
    this._graphAlgorithm = algorithm;
    return this._withGraph(exp, options, algorithm);
  }

  _withGraph(exp, options, algorithm) {
    const eagerOp = ensureEagerOperation(this, algorithm);
    const parsedExp = parseRelationExpression(this.modelClass(), exp);

    // The `joinOperation` option only applies to the relations of this call,
    // see `RelationJoiner`. All other options are shared by all calls.
    const { joinOperation, ...graphOptions } = options;

    eagerOp.expression = eagerOp.expression.merge(parsedExp);
    eagerOp.graphOptions = { ...eagerOp.graphOptions, ...graphOptions };

    if (joinOperation) {
      eagerOp.joinOperations.push({ expression: parsedExp, joinOperation });
    }

    checkMixedEager(this);
    checkEager(this);
    return this;
  }

  allowGraph(exp) {
    const currentExpr = this._allowedGraphExpression || RelationExpression.create();

    this._allowedGraphExpression = currentExpr.merge(
      parseRelationExpression(this.modelClass(), exp),
    );

    checkEager(this);
    return this;
  }

  allowedGraphExpression() {
    return this._allowedGraphExpression;
  }

  graphExpressionObject() {
    const expression = getGraphExpression(this);

    if (expression && !expression.isEmpty) {
      return expression.toPojo();
    } else {
      return null;
    }
  }

  graphModifiersAtPath() {
    const expression = getGraphExpression(this);

    if (expression && !expression.isEmpty) {
      return this._graphModifiersAtPath.map((it) => Object.assign({}, it));
    } else {
      return [];
    }
  }

  modifyGraph(path, modifier) {
    // The modifiers are shared by all eager operations. They only take effect
    // for the paths that exist in each operation's expression.
    ensureEagerOperation(this);
    this._graphModifiersAtPath.push({ path, modifier });
    return this;
  }

  findOptions(opt) {
    if (arguments.length !== 0) {
      this._findOperationOptions = Object.assign({}, this._findOperationOptions, opt);
      return this;
    } else {
      return this._findOperationOptions;
    }
  }

  resultModelClass() {
    return this._resultModelClass || this.modelClass();
  }

  isFind() {
    return !(
      this.isInsert() ||
      this.isUpdate() ||
      this.isDelete() ||
      this.isRelate() ||
      this.isUnrelate()
    );
  }

  isInsert() {
    return this.has(InsertOperation);
  }

  isUpdate() {
    return this.has(UpdateOperation);
  }

  isDelete() {
    return this.has(DeleteOperation);
  }

  isRelate() {
    return this.has(RelateOperation);
  }

  isUnrelate() {
    return this.has(UnrelateOperation);
  }

  hasWheres() {
    const queryWithoutGraph = this.clone().clearWithGraph();
    return prebuildQuery(queryWithoutGraph).has(QueryBuilderBase.WhereSelector);
  }

  hasSelects() {
    return this.has(QueryBuilderBase.SelectSelector);
  }

  hasWithGraph() {
    return findEagerOperations(this).some((eagerOp) => !eagerOp.expression.isEmpty);
  }

  isSelectAll() {
    if (this._operations.length === 0) {
      return true;
    }

    const tableRef = this.tableRef();
    const tableName = this.tableName();

    return this.everyOperation((op) => {
      if (op.constructor === SelectOperation) {
        // SelectOperations with zero selections are the ones that only have
        // raw items or other non-trivial selections.
        return (
          op.selections.length > 0 &&
          op.selections.every((select) => {
            return (!select.table || select.table === tableRef) && select.column === '*';
          })
        );
      } else if (op.constructor === FromOperation) {
        return op.table === tableName;
      } else if (op.name === 'as' || op.is(FindOperation) || op.is(OnErrorOperation)) {
        return true;
      } else {
        return false;
      }
    });
  }

  toString() {
    return '[object QueryBuilder]';
  }

  clone() {
    const builder = this.emptyInstance();

    // Call the super class's clone implementation.
    this.baseCloneInto(builder);

    builder._resultModelClass = this._resultModelClass;

    builder._explicitRejectValue = this._explicitRejectValue;
    builder._explicitResolveValue = this._explicitResolveValue;
    builder._modifiers = { ...this._modifiers };

    builder._allowedGraphExpression = this._allowedGraphExpression;
    builder._graphModifiersAtPath = this._graphModifiersAtPath.slice();
    builder._graphAlgorithm = this._graphAlgorithm;
    builder._isJoinChildQuery = this._isJoinChildQuery;
    builder._findOperationOptions = this._findOperationOptions;
    builder._relatedQueryFor = this._relatedQueryFor;

    return builder;
  }

  emptyInstance() {
    const builder = new this.constructor(this.modelClass());

    builder._findOperationFactory = this._findOperationFactory;
    builder._insertOperationFactory = this._insertOperationFactory;
    builder._updateOperationFactory = this._updateOperationFactory;
    builder._patchOperationFactory = this._patchOperationFactory;
    builder._relateOperationFactory = this._relateOperationFactory;
    builder._unrelateOperationFactory = this._unrelateOperationFactory;
    builder._deleteOperationFactory = this._deleteOperationFactory;
    builder._relatedQueryFor = this._relatedQueryFor;

    return builder;
  }

  // Registers a property of the result models that was selected internally,
  // e.g. by an eager operation, without the user asking for it. Such properties
  // are omitted from the result models before `runAfter` hooks are called.
  addInternalSelection(prop) {
    this._internalSelections.add(prop);
    return this;
  }

  clearWithGraph() {
    this.clear(EagerOperation);
    this._graphAlgorithm = null;
    return this;
  }

  clearWithGraphFetched() {
    this.clear(WhereInEagerOperation);
    return this;
  }

  clearAllowGraph() {
    this._allowedGraphExpression = null;
    return this;
  }

  clearModifiers() {
    this._modifiers = {};
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

  castTo(modelClass) {
    this._resultModelClass = modelClass || null;
    return this;
  }

  then(...args) {
    const promise = this.execute();
    return promise.then(...args);
  }

  catch(...args) {
    const promise = this.execute();
    return promise.catch(...args);
  }

  async resultSize() {
    const knex = this.knex();
    const builder = this.clone().clear(/orderBy|offset|limit/);
    const joinEagerOp = builder.findOperation(JoinEagerOperation);

    if (joinEagerOp) {
      // `withGraphJoined` needs the table metadata to build its selects.
      await joinEagerOp.onBefore3(builder);
    }

    const countQuery = knex.count('* as count').from((knexBuilder) => {
      // Also clear the order on the built knex query, since `orderBy` calls
      // can be added at build time, e.g. by a relation's `modify`.
      knexBuilder = builder.toKnexQuery(knexBuilder).clearOrder();

      if (joinEagerOp) {
        // The joins of `withGraphJoined` return one row per joined child.
        // Count the distinct root models instead.
        const tableRef = builder.tableRef();
        const idColumns = builder.modelClass().getIdColumnArray();
        knexBuilder.clearSelect().distinct(idColumns.map((col) => `${tableRef}.${col}`));
      }

      knexBuilder.as('temp');
    });

    if (this.internalOptions().debug) {
      countQuery.debug();
    }

    const result = await countQuery;
    return result[0] && result[0].count ? parseInt(result[0].count) : 0;
  }

  toKnexQuery(knexBuilder = this.knex().queryBuilder()) {
    const prebuiltQuery = prebuildQuery(this.clone());
    return buildKnexQuery(prebuiltQuery, knexBuilder);
  }

  async execute() {
    // Take a clone so that we don't modify this instance during execution.
    const builder = this.clone();

    try {
      await beforeExecute(builder);
      const result = await doExecute(builder);
      return await afterExecute(builder, result);
    } catch (error) {
      return await handleExecuteError(builder, error);
    }
  }

  throwIfNotFound(data = {}) {
    return this.runAfter((result) => {
      if (
        (Array.isArray(result) && result.length === 0) ||
        result === null ||
        result === undefined ||
        result === 0
      ) {
        throw this.modelClass().createNotFoundError(this.context(), data);
      } else {
        return result;
      }
    });
  }

  findSelection(selection, explicit = false) {
    let noSelectStatements = true;
    let selectionInstance = null;

    this.forEachOperation(true, (op) => {
      if (op.constructor === SelectOperation) {
        selectionInstance = op.findSelection(this, selection);
        noSelectStatements = false;

        if (selectionInstance) {
          return false;
        }
      }
    });

    if (selectionInstance) {
      return selectionInstance;
    }

    if (noSelectStatements && !explicit) {
      const selectAll = new Selection(this.tableRef(), '*');

      if (Selection.doesSelect(this, selectAll, selection)) {
        return selectAll;
      } else {
        return null;
      }
    } else {
      return null;
    }
  }

  findAllSelections() {
    let allSelections = [];

    this.forEachOperation(true, (op) => {
      if (op.constructor === SelectOperation) {
        allSelections = allSelections.concat(op.selections);
      }
    });

    return allSelections;
  }

  hasSelection(selection, explicit) {
    return this.findSelection(selection, explicit) !== null;
  }

  hasSelectionAs(selection, alias, explicit) {
    selection = Selection.create(selection);
    const foundSelection = this.findSelection(selection, explicit);

    if (foundSelection === null) {
      return false;
    } else {
      if (foundSelection.column === '*') {
        // * selects the columns with their column names as aliases.
        return selection.column === alias;
      } else {
        return foundSelection.name === alias;
      }
    }
  }

  traverse(modelClass, traverser) {
    if (typeof traverser === 'undefined') {
      traverser = modelClass;
      modelClass = null;
    }

    return this.runAfter((result) => {
      this.resultModelClass().traverse(modelClass, result, traverser);
      return result;
    });
  }

  page(page, pageSize) {
    return this.range(+page * +pageSize, (+page + 1) * +pageSize - 1);
  }

  columnInfo({ table = null } = {}) {
    table = table || this.tableName();

    const knex = this.knex();
    const tableParts = table.split('.');
    const columnInfoQuery = knex(last(tableParts)).columnInfo();
    const schema = this.internalOptions().schema;

    if (schema) {
      columnInfoQuery.withSchema(schema);
    } else if (tableParts.length > 1) {
      columnInfoQuery.withSchema(tableParts[0]);
    }

    if (this.internalOptions().debug) {
      columnInfoQuery.debug();
    }

    return columnInfoQuery;
  }

  withSchema(schema) {
    this.internalOptions().schema = schema;
    this.internalContext().onBuild.push((builder) => {
      if (!builder.has(/withSchema/)) {
        // Need to push this operation to the front because knex doesn't use the
        // schema for operations called before `withSchema`.
        builder.addOperationToFront(new KnexOperation('withSchema'), [schema]);
      }
    });

    return this;
  }

  debug /* istanbul ignore next */() {
    this.internalOptions().debug = true;
    this.internalContext().onBuild.push((builder) => {
      builder.addOperation(new KnexOperation('debug'), []);
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
        delegate: insertOperation,
      });

      this.addOperation(insertAndFetchOperation, [modelsOrObjects]);
    });
  }

  insertGraph(modelsOrObjects, opt) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      const insertGraphOperation = new InsertGraphOperation('insertGraph', {
        delegate: insertOperation,
        opt,
      });

      this.addOperation(insertGraphOperation, [modelsOrObjects]);
    });
  }

  insertGraphAndFetch(modelsOrObjects, opt) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      const insertGraphOperation = new InsertGraphOperation('insertGraph', {
        delegate: insertOperation,
        opt,
      });

      const insertGraphAndFetchOperation = new InsertGraphAndFetchOperation('insertGraphAndFetch', {
        delegate: insertGraphOperation,
      });

      return this.addOperation(insertGraphAndFetchOperation, [modelsOrObjects]);
    });
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

      if (!(updateOperation.instance instanceof this.modelClass())) {
        throw new Error('updateAndFetch can only be called for instance operations');
      }

      const updateAndFetch = new UpdateAndFetchOperation('updateAndFetch', {
        delegate: updateOperation,
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
        delegate: updateOperation,
      });

      this.addOperation(updateAndFetch, [id, modelOrObject]);
    });
  }

  upsertGraph(modelsOrObjects, upsertOptions) {
    return writeOperation(this, () => {
      const upsertGraphOperation = new UpsertGraphOperation('upsertGraph', {
        upsertOptions,
      });

      this.addOperation(upsertGraphOperation, [modelsOrObjects]);
    });
  }

  upsertGraphAndFetch(modelsOrObjects, upsertOptions) {
    return writeOperation(this, () => {
      const upsertGraphOperation = new UpsertGraphOperation('upsertGraph', {
        upsertOptions,
      });

      const upsertGraphAndFetchOperation = new UpsertGraphAndFetchOperation('upsertGraphAndFetch', {
        delegate: upsertGraphOperation,
      });

      return this.addOperation(upsertGraphAndFetchOperation, [modelsOrObjects]);
    });
  }

  patch(modelOrObject) {
    return writeOperation(this, () => {
      const patchOperation = this._patchOperationFactory(this);

      this.addOperation(patchOperation, [modelOrObject]);
    });
  }

  patchAndFetch(modelOrObject) {
    return writeOperation(this, () => {
      const patchOperation = this._patchOperationFactory(this);

      if (!(patchOperation.instance instanceof this.modelClass())) {
        throw new Error('patchAndFetch can only be called for instance operations');
      }

      const patchAndFetch = new UpdateAndFetchOperation('patchAndFetch', {
        delegate: patchOperation,
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
        delegate: patchOperation,
      });

      this.addOperation(patchAndFetch, [id, modelOrObject]);
    });
  }

  delete(...args) {
    return writeOperation(this, () => {
      if (args.length) {
        throw new Error(
          `Don't pass arguments to delete(). You should use it like this: delete().where('foo', 'bar').andWhere(...)`,
        );
      }

      const deleteOperation = this._deleteOperationFactory(this);
      this.addOperation(deleteOperation, args);
    });
  }

  del(...args) {
    return this.delete(...args);
  }

  relate(...args) {
    return writeOperation(this, () => {
      const relateOperation = this._relateOperationFactory(this);

      this.addOperation(relateOperation, args);
    });
  }

  unrelate(...args) {
    return writeOperation(this, () => {
      if (args.length) {
        throw new Error(
          `Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`,
        );
      }

      const unrelateOperation = this._unrelateOperationFactory(this);
      this.addOperation(unrelateOperation, args);
    });
  }

  increment(propertyName, howMuch) {
    const columnName = this.modelClass().propertyNameToColumnName(propertyName);

    return this.patch({
      [columnName]: raw('?? + ?', [columnName, howMuch]),
    });
  }

  decrement(propertyName, howMuch) {
    const columnName = this.modelClass().propertyNameToColumnName(propertyName);

    return this.patch({
      [columnName]: raw('?? - ?', [columnName, howMuch]),
    });
  }

  findOne(...args) {
    return this.where.apply(this, args).first();
  }

  range(...args) {
    return this.clear(RangeOperation).addOperation(new RangeOperation('range'), args);
  }

  first(...args) {
    return this.addOperation(new FirstOperation('first'), args);
  }

  none() {
    return this.addOperation(new NoneOperation('none'), []);
  }

  joinRelated(expression, options) {
    ensureJoinRelatedOperation(this, 'innerJoin').addCall({
      expression,
      options,
    });

    return this;
  }

  innerJoinRelated(expression, options) {
    ensureJoinRelatedOperation(this, 'innerJoin').addCall({
      expression,
      options,
    });

    return this;
  }

  outerJoinRelated(expression, options) {
    ensureJoinRelatedOperation(this, 'outerJoin').addCall({
      expression,
      options,
    });

    return this;
  }

  fullOuterJoinRelated(expression, options) {
    ensureJoinRelatedOperation(this, 'fullOuterJoin').addCall({
      expression,
      options,
    });

    return this;
  }

  leftJoinRelated(expression, options) {
    ensureJoinRelatedOperation(this, 'leftJoin').addCall({
      expression,
      options,
    });

    return this;
  }

  leftOuterJoinRelated(expression, options) {
    ensureJoinRelatedOperation(this, 'leftOuterJoin').addCall({
      expression,
      options,
    });

    return this;
  }

  rightJoinRelated(expression, options) {
    ensureJoinRelatedOperation(this, 'rightJoin').addCall({
      expression,
      options,
    });

    return this;
  }

  rightOuterJoinRelated(expression, options) {
    ensureJoinRelatedOperation(this, 'rightOuterJoin').addCall({
      expression,
      options,
    });

    return this;
  }

  updateById(id, modelOrObject) {
    return this.findById(id)
      .update(modelOrObject)
      .runBefore((_, builder) => {
        if (!builder.internalOptions().skipUndefined) {
          assertIdNotUndefined(id, `undefined was passed to updateById`);
        }
      });
  }

  patchById(id, modelOrObject) {
    return this.findById(id)
      .patch(modelOrObject)
      .runBefore((_, builder) => {
        if (!builder.internalOptions().skipUndefined) {
          assertIdNotUndefined(id, `undefined was passed to patchById`);
        }
      });
  }

  deleteById(id) {
    return this.findById(id)
      .delete()
      .runBefore((_, builder) => {
        if (!builder.internalOptions().skipUndefined) {
          assertIdNotUndefined(id, `undefined was passed to deleteById`);
        }
      });
  }

  findById(...args) {
    return this.addOperation(new FindByIdOperation('findById'), args).first();
  }

  findByIds(...args) {
    return this.addOperation(new FindByIdsOperation('findByIds'), args);
  }

  runBefore(...args) {
    return this.addOperation(new RunBeforeOperation('runBefore'), args);
  }

  onBuild(...args) {
    return this.addOperation(new OnBuildOperation('onBuild'), args);
  }

  onBuildKnex(...args) {
    return this.addOperation(new OnBuildKnexOperation('onBuildKnex'), args);
  }

  runAfter(...args) {
    return this.addOperation(new RunAfterOperation('runAfter'), args);
  }

  onError(...args) {
    return this.addOperation(new OnErrorOperation('onError'), args);
  }

  from(...args) {
    return this.addOperation(new FromOperation('from'), args);
  }

  updateFrom(...args) {
    return this.addOperation(new KnexOperation('updateFrom'), args);
  }

  table(...args) {
    return this.addOperation(new FromOperation('table'), args);
  }

  for(relatedQueryFor) {
    if (arguments.length === 0) {
      return this._relatedQueryFor;
    } else {
      // The write operation factories installed by the static `relatedQuery()`
      // read `for()` when the write method is called. Setting it afterwards
      // would make the query silently target the wrong rows.
      if (this._findOperationFactory !== findOperationFactory && !this.isFind()) {
        throw new Error(
          'for() must be called before insert, update, patch, delete, relate or unrelate on queries created using the static relatedQuery method',
        );
      }

      this._relatedQueryFor = relatedQueryFor;
      return this;
    }
  }
}

Object.defineProperties(QueryBuilder.prototype, {
  isObjectionQueryBuilder: {
    enumerable: false,
    writable: false,
    value: true,
  },
});

function getTableName(modelClassOrTableName) {
  if (isString(modelClassOrTableName)) {
    return modelClassOrTableName;
  } else {
    return modelClassOrTableName.getTableName();
  }
}

// A query builder can hold at most one eager operation of each kind: one
// `JoinEagerOperation` for `withGraphJoined` and one `WhereInEagerOperation`
// (or its subclass `NaiveEagerOperation`) for `withGraphFetched`.
function ensureEagerOperation(builder, algorithm = null) {
  const modelClass = builder.modelClass();
  const defaultGraphOptions = modelClass.getDefaultGraphOptions();

  if (!algorithm) {
    const eagerOp = builder.findOperation(EagerOperation);

    if (eagerOp) {
      return eagerOp;
    }

    algorithm = getWhereInEagerAlgorithm(builder);
  }

  const EagerOperationClass = getOperationClassForEagerAlgorithm(builder, algorithm);
  const EagerOperationKind = getEagerOperationKind(EagerOperationClass);
  const eagerOp = builder.findOperation(EagerOperationKind);

  if (eagerOp && eagerOp.constructor === EagerOperationClass) {
    return eagerOp;
  }

  const newEagerOp = new EagerOperationClass('eager', {
    defaultGraphOptions,
  });

  if (eagerOp) {
    // Switching between algorithms of the same kind, e.g. from
    // `WhereInEagerOperation` to `NaiveEagerOperation`.
    newEagerOp.cloneFrom(eagerOp);
    builder.clear(EagerOperationKind);
  } else if (!builder.has(EagerOperation)) {
    // The `modifyGraph` modifiers only live as long as an eager operation.
    builder._graphModifiersAtPath = [];
  }

  builder.addOperation(newEagerOp);

  // Keep the joined operation before the fetched one (see `findEagerOperations`),
  // even if it is added after `addImplicitOperations`, e.g. in `runBefore`.
  const fetchOp =
    EagerOperationKind === JoinEagerOperation && builder.findOperation(WhereInEagerOperation);

  if (fetchOp) {
    builder.removeOperation(fetchOp).addOperation(fetchOp);
  }

  return newEagerOp;
}

function getEagerOperationKind(EagerOperationClass) {
  return EagerOperationClass === JoinEagerOperation ? JoinEagerOperation : WhereInEagerOperation;
}

function findEagerOperations(builder) {
  // Joined operations first, so that their `onBuild` runs before the fetched
  // one's. See `WhereInEagerOperation.onBuild`.
  return [
    builder.findOperation(JoinEagerOperation),
    builder.findOperation(WhereInEagerOperation),
  ].filter(Boolean);
}

function getGraphExpression(builder) {
  const eagerOps = findEagerOperations(builder);

  if (eagerOps.length === 0) {
    return null;
  }

  return eagerOps.reduce(
    (expression, eagerOp) => expression.merge(eagerOp.expression),
    RelationExpression.create(),
  );
}

function getEagerAlgorithmByName(builder, name) {
  if (name === 'fetch') {
    return getWhereInEagerAlgorithm(builder);
  } else if (name === 'join') {
    return getJoinEagerAlgorithm(builder);
  } else {
    throw new Error(`unknown graph algorithm "${name}", expected "fetch" or "join"`);
  }
}

function getEagerAlgorithmOfOperation(builder, eagerOp) {
  if (eagerOp instanceof JoinEagerOperation) {
    return getJoinEagerAlgorithm(builder);
  } else if (eagerOp instanceof NaiveEagerOperation) {
    return getNaiveEagerAlgorithm(builder);
  } else {
    return getWhereInEagerAlgorithm(builder);
  }
}

// Splits `expression` by its top-level relations into one expression per eager
// algorithm. Relations that are already loaded by one of the eager operations
// keep its algorithm, new ones use the most recently used one.
function groupByEagerAlgorithm(builder, expression) {
  const defaultAlgorithm = builder._graphAlgorithm || getWhereInEagerAlgorithm(builder);
  const { node } = expression;
  const rootProps = {};
  const groups = new Map();

  for (const key of Object.keys(node)) {
    if (key.startsWith('$')) {
      rootProps[key] = node[key];
    }
  }

  for (const childName of node.$childNames) {
    const eagerOp = findEagerOperations(builder).find(
      (op) => op.expression.node.$allRecursive || op.expression.node[childName],
    );

    const algorithm = eagerOp ? getEagerAlgorithmOfOperation(builder, eagerOp) : defaultAlgorithm;
    let group = groups.get(algorithm);

    if (!group) {
      group = { ...rootProps, $childNames: [] };
      groups.set(algorithm, group);
    }

    group.$childNames.push(childName);
    group[childName] = node[childName];
  }

  if (groups.size === 0) {
    // No top-level relations, e.g. `*` or an empty expression.
    return [[defaultAlgorithm, expression]];
  }

  return [...groups].map(([algorithm, group]) => [algorithm, RelationExpression.create(group)]);
}

function getWhereInEagerAlgorithm(builder) {
  return builder.modelClass().WhereInEagerAlgorithm;
}

function getJoinEagerAlgorithm(builder) {
  return builder.modelClass().JoinEagerAlgorithm;
}

function getNaiveEagerAlgorithm(builder) {
  return builder.modelClass().NaiveEagerAlgorithm;
}

function getOperationClassForEagerAlgorithm(builder, algorithm) {
  if (algorithm === getJoinEagerAlgorithm(builder)) {
    return JoinEagerOperation;
  } else if (algorithm === getNaiveEagerAlgorithm(builder)) {
    return NaiveEagerOperation;
  } else {
    return WhereInEagerOperation;
  }
}

function parseRelationExpression(modelClass, exp) {
  try {
    return RelationExpression.create(exp);
  } catch (err) {
    if (err instanceof DuplicateRelationError) {
      throw modelClass.createValidationError({
        type: ValidationErrorType.RelationExpression,
        message: `Duplicate relation name "${err.relationName}" in relation expression "${exp}". For example, use "${err.relationName}.[foo, bar]" instead of "[${err.relationName}.foo, ${err.relationName}.bar]".`,
      });
    } else {
      throw modelClass.createValidationError({
        type: ValidationErrorType.RelationExpression,
        message: `Invalid relation expression "${exp}"`,
      });
    }
  }
}

function checkMixedEager(builder) {
  const joinOp = builder.findOperation(JoinEagerOperation);
  const fetchOp = builder.findOperation(WhereInEagerOperation);

  if (!joinOp || !fetchOp) {
    return;
  }

  const joinNode = joinOp.expression.node;
  const fetchNode = fetchOp.expression.node;
  const isUsed = (node) => node.$allRecursive || node.$childNames.length > 0;

  if (!isUsed(joinNode) || !isUsed(fetchNode)) {
    return;
  }

  if (joinNode.$allRecursive || fetchNode.$allRecursive) {
    throw new Error(
      'relation expression `*` cannot be used when mixing withGraphJoined and withGraphFetched',
    );
  }

  for (const childName of joinNode.$childNames) {
    if (fetchNode.$childNames.includes(childName)) {
      throw new Error(
        `relation \`${childName}\` cannot be loaded with both withGraphJoined and withGraphFetched`,
      );
    }
  }
}

function checkEager(builder) {
  const expr = getGraphExpression(builder);

  if (!expr) {
    return;
  }

  const allowedExpr = builder.allowedGraphExpression();

  if (expr.numChildren > 0 && allowedExpr && !allowedExpr.isSubExpression(expr)) {
    const modelClass = builder.modelClass();

    builder.reject(
      modelClass.createValidationError({
        type: ValidationErrorType.UnallowedRelation,
        message: 'eager expression not allowed',
      }),
    );
  }
}

function findQueryExecutorOperation(builder) {
  return builder.findOperation((op) => op.hasQueryExecutor());
}

function beforeExecute(builder) {
  let promise = Promise.resolve();

  checkRelatedQueryFor(builder);
  builder = addImplicitOperations(builder);

  // Resolve all before hooks before building and executing the query
  // and the rest of the hooks.
  promise = chainOperationHooks(promise, builder, 'onBefore1');
  promise = chainOperationHooks(promise, builder, 'onBefore2');

  promise = chainHooks(promise, builder, builder.context().runBefore);
  promise = chainHooks(promise, builder, builder.internalContext().runBefore);

  promise = chainOperationHooks(promise, builder, 'onBefore3');

  return promise;
}

function doExecute(builder) {
  let promise = Promise.resolve();

  builder = callOnBuildHooks(builder);
  const queryExecutorOperation = findQueryExecutorOperation(builder);

  const explicitRejectValue = builder._explicitRejectValue;
  const explicitResolveValue = builder._explicitResolveValue;

  if (explicitRejectValue !== null) {
    promise = Promise.reject(explicitRejectValue);
  } else if (explicitResolveValue !== null) {
    promise = Promise.resolve(explicitResolveValue);
  } else if (queryExecutorOperation !== null) {
    promise = Promise.resolve(queryExecutorOperation.queryExecutor(builder));
  } else {
    promise = Promise.resolve(buildKnexQuery(builder));

    promise = chainOperationHooks(promise, builder, 'onRawResult');
    promise = promise.then((result) => createModels(result, builder));
  }

  return promise;
}

function afterExecute(builder, result) {
  let promise = Promise.resolve(result);

  promise = chainOperationHooks(promise, builder, 'onAfter1');
  promise = chainOperationHooks(promise, builder, 'onAfter2');
  promise = promise.then((result) => omitInternalSelections(builder, result));

  promise = chainHooks(promise, builder, builder.context().runAfter);
  promise = chainHooks(promise, builder, builder.internalContext().runAfter);

  promise = chainOperationHooks(promise, builder, 'onAfter3');

  return promise;
}

function omitInternalSelections(builder, result) {
  const props = builder._internalSelections;

  if (props.size && Array.isArray(result) && isObject(result[0])) {
    const modelClass = builder.resultModelClass();

    for (const model of result) {
      for (const prop of props) {
        modelClass.omitImpl(model, prop);
      }
    }
  }

  return result;
}

class ReturnImmediatelyException {
  constructor(value) {
    this.value = value;
  }
}

function handleReturnImmediatelyValue(builder) {
  const { returnImmediatelyValue } = builder.internalOptions();
  if (returnImmediatelyValue !== undefined) {
    throw new ReturnImmediatelyException(returnImmediatelyValue);
  }
}

function handleExecuteError(builder, err) {
  if (err instanceof ReturnImmediatelyException) {
    return Promise.resolve(err.value);
  }

  let promise = Promise.reject(wrapDbError(err));

  builder.forEachOperation(true, (op) => {
    if (op.hasOnError()) {
      promise = promise.catch((err) =>
        builder.callAsyncOperationMethod(op, 'onError', [builder, err]),
      );
    }
  });

  return promise;
}

function chainOperationHooks(promise, builder, hookName) {
  return promise.then((result) => {
    let promise = Promise.resolve(result);

    builder.forEachOperation(true, (op) => {
      if (op.hasHook(hookName)) {
        promise = promise.then((result) => {
          const res = builder.callAsyncOperationMethod(op, hookName, [builder, result]);
          handleReturnImmediatelyValue(builder);
          return res;
        });
      }
    });

    return promise;
  });
}

function ensureJoinRelatedOperation(builder, joinOperation) {
  const opName = joinOperation + 'Relation';
  let op = builder.findOperation(opName);

  if (!op) {
    op = new JoinRelatedOperation(opName, { joinOperation });
    builder.addOperation(op);
  }

  return op;
}

function prebuildQuery(builder) {
  checkRelatedQueryFor(builder);
  builder = addImplicitOperations(builder);
  builder = callOnBuildHooks(builder);

  const queryExecutorOperation = findQueryExecutorOperation(builder);

  if (queryExecutorOperation) {
    return prebuildQuery(queryExecutorOperation.queryExecutor(builder));
  } else {
    return builder;
  }
}

function checkRelatedQueryFor(builder) {
  // `for()` is only consumed by the operation factories installed by the static
  // `relatedQuery()`. The default ones ignore it, which would silently make the
  // query target all rows of the table.
  if (builder.for() !== null && builder._findOperationFactory === findOperationFactory) {
    throw new Error(
      'for() can only be used with queries created using the static relatedQuery method',
    );
  }
}

function addImplicitOperations(builder) {
  if (builder.isFind()) {
    // If no write operations have been called at this point this query is a
    // find query and we need to call the custom find implementation.
    addFindOperation(builder);
  }

  if (builder.hasWithGraph()) {
    moveEagerOperationToEnd(builder);
  }

  return builder;
}

function addFindOperation(builder) {
  if (!builder.has(FindOperation)) {
    const operation = builder._findOperationFactory(builder);
    builder.addOperationToFront(operation, []);
  }
}

function moveEagerOperationToEnd(builder) {
  const eagerOps = findEagerOperations(builder);

  builder.clear(EagerOperation);

  for (const eagerOp of eagerOps) {
    builder.addOperation(eagerOp);
  }
}

function callOnBuildHooks(builder) {
  callOnBuildFuncs(builder, builder.context().onBuild);
  callOnBuildFuncs(builder, builder.internalContext().onBuild);

  builder.executeOnBuild();
  return wrapWhereGroups(builder);
}

function callOnBuildFuncs(builder, func) {
  if (isFunction(func)) {
    func.call(builder, builder);
  } else if (Array.isArray(func)) {
    func.forEach((func) => callOnBuildFuncs(builder, func));
  }
}

function buildKnexQuery(builder, knexBuilder = builder.knex().queryBuilder()) {
  knexBuilder = builder.executeOnBuildKnex(knexBuilder);

  const noneOperation = builder.findOperation(NoneOperation);

  if (noneOperation) {
    knexBuilder = noneOperation.onAfterBuildKnex(knexBuilder);
  }

  const fromOperation = builder.findLastOperation(QueryBuilderBase.FromSelector);

  if (!builder.isPartial()) {
    // Set the table only if it hasn't been explicitly set yet.
    if (!fromOperation) {
      knexBuilder = setDefaultTable(builder, knexBuilder);
    }

    // Only add `table.*` select if there are no explicit selects
    // and `from` is a table name and not a subquery.
    if (!builder.hasSelects() && (!fromOperation || fromOperation.table)) {
      knexBuilder = setDefaultSelect(builder, knexBuilder);
    }
  }

  return knexBuilder;
}

function setDefaultTable(builder, knexBuilder) {
  const table = builder.tableName();
  const tableRef = builder.tableRef();

  if (table === tableRef) {
    return knexBuilder.table(table);
  } else {
    return knexBuilder.table(`${table} as ${tableRef}`);
  }
}

function setDefaultSelect(builder, knexBuilder) {
  const tableRef = builder.tableRef();

  return knexBuilder.select(`${tableRef}.*`);
}

async function chainHooks(promise, builder, func) {
  return promise.then((result) => {
    let promise = Promise.resolve(result);

    if (isFunction(func)) {
      promise = promise.then((result) => {
        const res = func.call(builder, result, builder);
        handleReturnImmediatelyValue(builder);
        return res;
      });
    } else if (Array.isArray(func)) {
      func.forEach((func) => {
        promise = chainHooks(promise, builder, func);
      });
    }

    return promise;
  });
}

function createModels(result, builder) {
  if (result === null || result === undefined) {
    return null;
  }

  if (builder.isInsert()) {
    // results are applied to input models in `InsertOperation.onAfter1` instead.
    return result;
  }

  const modelClass = builder.resultModelClass();

  if (Array.isArray(result)) {
    if (result.length && shouldBeConvertedToModel(result[0], modelClass)) {
      for (let i = 0, l = result.length; i < l; ++i) {
        result[i] = modelClass.fromDatabaseJson(result[i]);
      }
    }
  } else if (shouldBeConvertedToModel(result, modelClass)) {
    result = modelClass.fromDatabaseJson(result);
  }

  return result;
}

function shouldBeConvertedToModel(obj, modelClass) {
  return isObject(obj) && !(obj instanceof modelClass);
}

function writeOperation(builder, cb) {
  if (!builder.isFind()) {
    return builder.reject(
      new Error(
        'Double call to a write method. ' +
          'You can only call one of the write methods ' +
          '(insert, update, patch, delete, relate, unrelate, increment, decrement) ' +
          'and only once per query builder.',
      ),
    );
  }

  try {
    cb();
    return builder;
  } catch (err) {
    return builder.reject(err);
  }
}

function findOperationFactory() {
  return new FindOperation('find');
}

function insertOperationFactory() {
  return new InsertOperation('insert');
}

function updateOperationFactory() {
  return new UpdateOperation('update');
}

function patchOperationFactory() {
  return new UpdateOperation('patch', {
    modelOptions: { patch: true },
  });
}

function relateOperationFactory() {
  return new RelateOperation('relate', {});
}

function unrelateOperationFactory() {
  return new UnrelateOperation('unrelate', {});
}

function deleteOperationFactory() {
  return new DeleteOperation('delete');
}

module.exports = {
  QueryBuilder,
};
