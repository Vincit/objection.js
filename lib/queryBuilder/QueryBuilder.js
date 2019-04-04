'use strict';

const Bluebird = require('bluebird');

const { raw } = require('./RawBuilder');
const { createModifier } = require('../utils/createModifier');
const { ValidationErrorType } = require('../model/ValidationError');
const { isObject, isString, isFunction, last } = require('../utils/objectUtils');
const { RelationExpression, DuplicateRelationError } = require('./RelationExpression');
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
const { JoinRelationOperation } = require('./operations/JoinRelationOperation');
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
const { FromOperation } = require('./operations/FromOperation');
const { KnexOperation } = require('./operations/KnexOperation');

class QueryBuilder extends QueryBuilderBase {
  static init(self, modelClass) {
    super.init(self, modelClass);

    self._resultModelClass = null;
    self._explicitRejectValue = null;
    self._explicitResolveValue = null;

    self._allowedUpsertExpression = null;
    self._findOperationOptions = modelClass.defaultFindOptions;

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
    const tableName = this.tableRefFor(modelClass.getTableName());
    const idColumn = modelClass.getIdColumn();

    if (Array.isArray(idColumn)) {
      return idColumn.map(col => `${tableName}.${col}`);
    } else {
      return `${tableName}.${idColumn}`;
    }
  }

  fullIdColumn() {
    return this.fullIdColumnFor(this.modelClass());
  }

  applyModifier(...args) {
    for (const arg of args) {
      const modifier = createModifier({
        modifier: arg,
        modelClass: this.modelClass()
      });

      modifier(this);
    }

    return this;
  }

  applyFilter(...args) {
    return this.applyModifier(...args);
  }

  modify(...args) {
    const arg = args[0];
    if (isFunction(arg)) {
      super.modify(...args);
    } else if (arg) {
      this.applyModifier(...args);
    }
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

  eagerAlgorithm(algorithm, eagerOptions) {
    ensureEagerOperation(this, algorithm);

    if (eagerOptions) {
      this.eagerOptions(eagerOptions);
    }

    return this;
  }

  eager(exp, modifiers) {
    const eagerOp = ensureEagerOperation(this);

    eagerOp.expression = parseRelationExpression(this.modelClass(), exp);
    eagerOp.modifiers = modifiers;

    checkEager(this);
    return this;
  }

  joinEager(exp, modifiers) {
    return this.eagerAlgorithm(getJoinEagerAlgorithm(this)).eager(exp, modifiers);
  }

  naiveEager(exp, modifiers) {
    return this.eagerAlgorithm(getNaiveEagerAlgorithm(this)).eager(exp, modifiers);
  }

  mergeEager(exp, modifiers) {
    const eagerOp = ensureEagerOperation(this);

    eagerOp.expression = eagerOp.expression.merge(parseRelationExpression(this.modelClass(), exp));

    eagerOp.modifiers = Object.assign({}, eagerOp.modifiers, modifiers);

    checkEager(this);
    return this;
  }

  mergeJoinEager(exp, modifiers) {
    return this.eagerAlgorithm(this.modelClass().JoinEagerAlgorithm).mergeEager(exp, modifiers);
  }

  mergeNaiveEager(exp, modifiers) {
    return this.eagerAlgorithm(this.modelClass().NaiveEagerAlgorithm).mergeEager(exp, modifiers);
  }

  allowEager(exp) {
    const eagerOp = ensureEagerOperation(this);
    eagerOp.allowedExpression = parseRelationExpression(this.modelClass(), exp);

    checkEager(this);
    return this;
  }

  mergeAllowEager(exp) {
    const eagerOp = ensureEagerOperation(this);

    if (eagerOp.allowedExpression) {
      eagerOp.allowedExpression = eagerOp.allowedExpression.merge(
        parseRelationExpression(this.modelClass(), exp)
      );
    } else {
      eagerOp.allowedExpression = parseRelationExpression(this.modelClass(), exp);
    }

    checkEager(this);
    return this;
  }

  eagerObject() {
    const eagerOp = this.findOperation(EagerOperation);

    if (eagerOp && !eagerOp.expression.isEmpty) {
      return eagerOp.expression.toPojo();
    } else {
      return null;
    }
  }

  eagerModifiers() {
    const eagerOp = this.findOperation(EagerOperation);

    if (eagerOp && !eagerOp.expression.isEmpty) {
      return Object.assign({}, eagerOp.modifiers);
    } else {
      return {};
    }
  }

  eagerModifiersAtPath() {
    const eagerOp = this.findOperation(EagerOperation);

    if (eagerOp && !eagerOp.expression.isEmpty) {
      return eagerOp.modifiersAtPath.map(it => Object.assign({}, it));
    } else {
      return [];
    }
  }

  modifyEager(path, modifier) {
    const eagerOp = ensureEagerOperation(this);
    eagerOp.modifiersAtPath.push({ path, modifier });
    return this;
  }

  filterEager(...args) {
    return this.modifyEager(...args);
  }

  allowUpsert(exp) {
    this._allowedUpsertExpression = exp || null;

    if (isString(this._allowedUpsertExpression)) {
      this._allowedUpsertExpression = parseRelationExpression(
        this.modelClass(),
        this._allowedUpsertExpression
      );
    }

    return this;
  }

  allowedUpsertExpression() {
    return this._allowedUpsertExpression;
  }

  allowInsert(exp) {
    return this.allowUpsert(exp);
  }

  eagerOptions(opt) {
    const eagerOp = ensureEagerOperation(this);
    eagerOp.eagerOptions = Object.assign({}, eagerOp.eagerOptions, opt);
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
    return this.has(QueryBuilderBase.WhereSelector);
  }

  hasSelects() {
    return this.has(QueryBuilderBase.SelectSelector);
  }

  hasEager() {
    const eagerOp = this.findOperation(EagerOperation);
    return !!eagerOp && !eagerOp.expression.isEmpty;
  }

  isSelectAll() {
    if (this._operations.length === 0) {
      return true;
    }

    const tableRef = this.tableRef();
    const tableName = this.tableNameFor(this.modelClass().getTableName());

    return this.everyOperation(op => {
      if (op.constructor === SelectOperation) {
        // SelectOperations with zero selections are the ones that only have
        // raw items or other non-trivial selections.
        return (
          op.selections.length > 0 &&
          op.selections.every(select => {
            return (!select.table || select.table === tableRef) && select.column === '*';
          })
        );
      } else if (op.constructor === FromOperation) {
        return op.table === tableName;
      } else if (op.name === 'as' || op.is(FindOperation)) {
        return true;
      } else {
        return false;
      }
    });
  }

  isFindQuery() {
    console.warn(
      `isFindQuery is deprecated. Use isFind instead. This method will be removed in version 2.0`
    );
    return this.isFind();
  }

  isEagerQuery() {
    console.warn(
      `isEagerQuery is deprecated. Use hasEager instead. This method will be removed in version 2.0`
    );
    return this.hasEager();
  }

  toString() {
    try {
      return this.toKnexQuery().toString();
    } catch (err) {
      return `This query cannot be built synchronously. Consider using debug() method instead.`;
    }
  }

  toSql() {
    return this.toString();
  }

  clone() {
    const builder = new this.constructor(this.modelClass());

    // Call the super class's clone implementation.
    this.baseCloneInto(builder);

    builder._resultModelClass = this._resultModelClass;

    builder._explicitRejectValue = this._explicitRejectValue;
    builder._explicitResolveValue = this._explicitResolveValue;

    builder._allowedUpsertExpression = this._allowedUpsertExpression;
    builder._findOperationOptions = this._findOperationOptions;

    builder._findOperationFactory = this._findOperationFactory;
    builder._insertOperationFactory = this._insertOperationFactory;
    builder._updateOperationFactory = this._updateOperationFactory;
    builder._patchOperationFactory = this._patchOperationFactory;
    builder._relateOperationFactory = this._relateOperationFactory;
    builder._unrelateOperationFactory = this._unrelateOperationFactory;
    builder._deleteOperationFactory = this._deleteOperationFactory;

    return builder;
  }

  clearEager() {
    this.clear(EagerOperation);
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
    this._resultModelClass = modelClass;
    return this;
  }

  then(...args) {
    const promise = this.execute();
    return promise.then(...args);
  }

  map(...args) {
    const promise = this.execute();
    return promise.map(...args);
  }

  reduce(...args) {
    const promise = this.execute();
    return promise.reduce(...args);
  }

  catch(...args) {
    const promise = this.execute();
    return promise.catch(...args);
  }

  return(...args) {
    const promise = this.execute();
    return promise.return(...args);
  }

  reflect() {
    const promise = this.execute();
    return promise.reflect();
  }

  bind(...args) {
    const promise = this.execute();
    return promise.bind(...args);
  }

  asCallback(...args) {
    const promise = this.execute();
    return promise.asCallback(...args);
  }

  nodeify(...args) {
    const promise = this.execute();
    return promise.nodeify(...args);
  }

  resultSize() {
    const knex = this.knex();
    const builder = this.clone().clear(/orderBy|offset|limit/);

    const countQuery = knex.count('* as count').from(knexBuilder => {
      builder.toKnexQuery(knexBuilder).as('temp');
    });

    if (this.internalOptions().debug) {
      countQuery.debug();
    }

    return countQuery.then(
      result => (result[0] && result[0].count ? parseInt(result[0].count, 10) : 0)
    );
  }

  toKnexQuery(knexBuilder = this.knex().queryBuilder()) {
    // Take a clone so that we don't modify this instance during build.
    let builder = this.clone();

    builder = addImplicitOperations(builder);
    builder = callOnBuildHooks(builder);

    const queryExecutorOperation = findQueryExecutorOperation(builder);

    if (queryExecutorOperation) {
      // If the query executor is set, we build the builder that it returns.
      return queryExecutorOperation.queryExecutor(builder).toKnexQuery();
    } else {
      return buildKnexQuery(builder, knexBuilder);
    }
  }

  execute() {
    // Take a clone so that we don't modify this instance during execution.
    const builder = this.clone();

    return Bluebird.try(() => beforeExecute(builder))
      .then(() => doExecute(builder))
      .then(result => afterExecute(builder, result))
      .catch(error => handleExecuteError(builder, error));
  }

  pluck(propertyName) {
    return this.runAfter(result => {
      if (Array.isArray(result)) {
        return result.map(it => it && it[propertyName]);
      } else if (isObject(result)) {
        return result[propertyName];
      } else {
        return result;
      }
    });
  }

  throwIfNotFound() {
    return this.runAfter(result => {
      if (
        (Array.isArray(result) && result.length === 0) ||
        result === null ||
        result === undefined ||
        result === 0
      ) {
        throw this.modelClass().createNotFoundError(this.context());
      } else {
        return result;
      }
    });
  }

  findSelection(selection, explicit = false) {
    let noSelectStatements = true;
    let selectionInstance = null;

    this.forEachOperation(true, op => {
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

    this.forEachOperation(true, op => {
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

    return this.runAfter(result => {
      this.resultModelClass().traverse(modelClass, result, traverser);
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
    return this.range(+page * +pageSize, (+page + 1) * +pageSize - 1);
  }

  columnInfo({ table = null } = {}) {
    table = table || this.tableNameFor(this.modelClass().getTableName());

    const knex = this.knex();
    const tableParts = table.split('.');
    const columnInfoQuery = knex(last(tableParts)).columnInfo();

    if (tableParts.length > 1) {
      columnInfoQuery.withSchema(tableParts[0]);
    }

    if (this.internalOptions().debug) {
      columnInfoQuery.debug();
    }

    return columnInfoQuery;
  }

  withSchema(schema) {
    this.internalContext().onBuild.push(builder => {
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
    this.internalContext().onBuild.push(builder => {
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
        delegate: insertOperation
      });

      this.addOperation(insertAndFetchOperation, [modelsOrObjects]);
    });
  }

  insertGraph(modelsOrObjects, opt) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      const insertGraphOperation = new InsertGraphOperation('insertGraph', {
        delegate: insertOperation,
        opt
      });

      this.addOperation(insertGraphOperation, [modelsOrObjects]);
    });
  }

  insertWithRelated(...args) {
    console.warn(
      `insertWithRelated is deprecated. Use insertGraph instead. This method will be removed in version 2.0`
    );
    return this.insertGraph(...args);
  }

  insertGraphAndFetch(modelsOrObjects, opt) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      const insertGraphOperation = new InsertGraphOperation('insertGraph', {
        delegate: insertOperation,
        opt
      });

      const insertGraphAndFetchOperation = new InsertGraphAndFetchOperation('insertGraphAndFetch', {
        delegate: insertGraphOperation
      });

      return this.addOperation(insertGraphAndFetchOperation, [modelsOrObjects]);
    });
  }

  insertWithRelatedAndFetch(...args) {
    console.warn(
      `insertWithRelatedAndFetch is deprecated. Use insertGraphAndFetch instead. This method will be removed in version 2.0`
    );
    return this.insertGraphAndFetch(...args);
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

  upsertGraph(modelsOrObjects, upsertOptions) {
    return writeOperation(this, () => {
      const upsertGraphOperation = new UpsertGraphOperation('upsertGraph', {
        upsertOptions
      });

      this.addOperation(upsertGraphOperation, [modelsOrObjects]);
    });
  }

  upsertGraphAndFetch(modelsOrObjects, upsertOptions) {
    return writeOperation(this, () => {
      const upsertGraphOperation = new UpsertGraphOperation('upsertGraph', {
        upsertOptions
      });

      const upsertGraphAndFetchOperation = new UpsertGraphAndFetchOperation('upsertGraphAndFetch', {
        delegate: upsertGraphOperation
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

  delete(...args) {
    return writeOperation(this, () => {
      if (args.length) {
        throw new Error(
          `Don't pass arguments to delete(). You should use it like this: delete().where('foo', 'bar').andWhere(...)`
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
          `Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`
        );
      }

      const unrelateOperation = this._unrelateOperationFactory(this);
      this.addOperation(unrelateOperation, args);
    });
  }

  increment(propertyName, howMuch) {
    const columnName = this.modelClass().propertyNameToColumnName(propertyName);

    return this.patch({
      [columnName]: raw('?? + ?', [columnName, howMuch])
    });
  }

  decrement(propertyName, howMuch) {
    const columnName = this.modelClass().propertyNameToColumnName(propertyName);

    return this.patch({
      [columnName]: raw('?? - ?', [columnName, howMuch])
    });
  }

  findOne(...args) {
    return this.where.apply(this, args).first();
  }

  range(...args) {
    return this.addOperation(new RangeOperation('range'), args);
  }

  first(...args) {
    return this.addOperation(new FirstOperation('first'), args);
  }

  joinRelation(expression, options) {
    ensureJoinRelationOperation(this, 'innerJoin').addCall({
      expression,
      options
    });

    return this;
  }

  innerJoinRelation(expression, options) {
    ensureJoinRelationOperation(this, 'innerJoin').addCall({
      expression,
      options
    });

    return this;
  }

  outerJoinRelation(expression, options) {
    ensureJoinRelationOperation(this, 'outerJoin').addCall({
      expression,
      options
    });

    return this;
  }

  fullOuterJoinRelation(expression, options) {
    ensureJoinRelationOperation(this, 'fullOuterJoin').addCall({
      expression,
      options
    });

    return this;
  }

  leftJoinRelation(expression, options) {
    ensureJoinRelationOperation(this, 'leftJoin').addCall({
      expression,
      options
    });

    return this;
  }

  leftOuterJoinRelation(expression, options) {
    ensureJoinRelationOperation(this, 'leftOuterJoin').addCall({
      expression,
      options
    });

    return this;
  }

  rightJoinRelation(expression, options) {
    ensureJoinRelationOperation(this, 'rightJoin').addCall({
      expression,
      options
    });

    return this;
  }

  rightOuterJoinRelation(expression, options) {
    ensureJoinRelationOperation(this, 'rightOuterJoin').addCall({
      expression,
      options
    });

    return this;
  }

  deleteById(...args) {
    return this.findById(...args).delete();
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

  table(...args) {
    return this.addOperation(new FromOperation('table'), args);
  }
}

Object.defineProperties(QueryBuilder.prototype, {
  isObjectionQueryBuilder: {
    enumerable: false,
    writable: false,
    value: true
  }
});

function getTableName(modelClassOrTableName) {
  if (isString(modelClassOrTableName)) {
    return modelClassOrTableName;
  } else {
    return modelClassOrTableName.getTableName();
  }
}

function ensureEagerOperation(builder, algorithm = null) {
  const defaultEagerOptions = builder.modelClass().defaultEagerOptions;
  const eagerOp = builder.findOperation(EagerOperation);

  if (algorithm) {
    const EagerOperationClass = getOperationClassForEagerAlgorithm(builder, algorithm);

    if (eagerOp instanceof EagerOperationClass) {
      return eagerOp;
    } else {
      const newEagerOp = new EagerOperationClass('eager', {
        defaultEagerOptions
      });

      if (eagerOp) {
        newEagerOp.cloneFrom(eagerOp);
      }

      builder.clear(EagerOperation);
      builder.addOperation(newEagerOp);

      return newEagerOp;
    }
  } else {
    if (eagerOp) {
      return eagerOp;
    } else {
      const EagerOperationClass = getOperationClassForEagerAlgorithm(
        builder,
        getDefaultEagerAlgorithm(builder)
      );

      const newEagerOp = new EagerOperationClass('eager', {
        defaultEagerOptions
      });

      builder.addOperation(newEagerOp);

      return newEagerOp;
    }
  }
}

function getDefaultEagerAlgorithm(builder) {
  return builder.modelClass().defaultEagerAlgorithm;
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
        message: `Duplicate relation name "${
          err.relationName
        }" in relation expression "${exp}". Use "a.[b, c]" instead of "[a.b, a.c]".`
      });
    } else {
      throw modelClass.createValidationError({
        type: ValidationErrorType.RelationExpression,
        message: `Invalid relation expression "${exp}"`
      });
    }
  }
}

function checkEager(builder) {
  const eagerOp = builder.findOperation(EagerOperation);

  if (!eagerOp) {
    return;
  }

  const expr = eagerOp.expression;
  const allowedExpr = eagerOp.allowedExpression;

  if (expr.numChildren > 0 && allowedExpr && !allowedExpr.isSubExpression(expr)) {
    const modelClass = builder.modelClass();

    builder.reject(
      modelClass.createValidationError({
        type: ValidationErrorType.UnallowedRelation,
        message: 'eager expression not allowed'
      })
    );
  }
}

function findQueryExecutorOperation(builder) {
  return builder.findOperation(op => op.hasQueryExecutor());
}

function beforeExecute(builder) {
  let promise = Promise.resolve();

  builder = addImplicitOperations(builder);

  // Resolve all before hooks before building and executing the query
  // and the rest of the hooks.
  promise = chainOperationHooks(promise, builder, 'onBefore1');

  promise = chainHooks(promise, builder, builder.context().runBefore);
  promise = chainHooks(promise, builder, builder.internalContext().runBefore);

  promise = chainOperationHooks(promise, builder, 'onBefore2');
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
    promise = promise.then(result => createModels(result, builder));
  }

  return promise;
}

function afterExecute(builder, result) {
  let promise = Promise.resolve(result);

  promise = chainOperationHooks(promise, builder, 'onAfter1');
  promise = chainOperationHooks(promise, builder, 'onAfter2');

  promise = chainHooks(promise, builder, builder.context().runAfter);
  promise = chainHooks(promise, builder, builder.internalContext().runAfter);

  promise = chainOperationHooks(promise, builder, 'onAfter3');

  return promise;
}

function handleExecuteError(builder, err) {
  let promise = Promise.reject(err);

  builder.forEachOperation(true, op => {
    if (op.hasOnError()) {
      promise = promise.catch(err =>
        builder.callAsyncOperationMethod(op, 'onError', [builder, err])
      );
    }
  });

  return promise;
}

function chainOperationHooks(promise, builder, hookName) {
  return promise.then(result => {
    let promise = Promise.resolve(result);

    builder.forEachOperation(true, op => {
      if (op.hasHook(hookName)) {
        promise = promise.then(result =>
          builder.callAsyncOperationMethod(op, hookName, [builder, result])
        );
      }
    });

    return promise;
  });
}

function ensureJoinRelationOperation(builder, joinOperation) {
  const opName = joinOperation + 'Relation';
  let op = builder.findOperation(opName);

  if (!op) {
    op = new JoinRelationOperation(opName, { joinOperation });
    builder.addOperation(op);
  }

  return op;
}

function addImplicitOperations(builder) {
  if (builder.isFind()) {
    // If no write operations have been called at this point this query is a
    // find query and we need to call the custom find implementation.
    addFindOperation(builder);
  }

  if (builder.hasEager()) {
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
  const eagerOp = builder.findOperation(EagerOperation);

  builder.clear(EagerOperation);
  builder.addOperation(eagerOp);
}

function callOnBuildHooks(builder) {
  callOnBuildFuncs(builder, builder.context().onBuild);
  callOnBuildFuncs(builder, builder.internalContext().onBuild);

  builder.executeOnBuild();
  return builder;
}

function callOnBuildFuncs(builder, func) {
  if (isFunction(func)) {
    func.call(builder, builder);
  } else if (Array.isArray(func)) {
    func.forEach(func => callOnBuildFuncs(builder, func));
  }
}

function buildKnexQuery(builder, knexBuilder = builder.knex().queryBuilder()) {
  builder.executeOnBuildKnex(knexBuilder);

  const fromOperation = builder.findLastOperation(QueryBuilderBase.FromSelector);
  const hasSelects = builder.has(QueryBuilderBase.SelectSelector);

  // Set the table only if it hasn't been explicitly set yet.
  if (!builder.isPartial() && !fromOperation) {
    setDefaultTable(builder, knexBuilder);
  }

  // Only add `table.*` select if there are no explicit selects
  // and `from` is a table name and not a subquery.
  if (!builder.isPartial() && !hasSelects && (!fromOperation || fromOperation.table)) {
    setDefaultSelect(builder, knexBuilder);
  }

  return knexBuilder;
}

function setDefaultTable(builder, knexBuilder) {
  const table = builder.tableNameFor(builder.modelClass().getTableName());
  const tableRef = builder.tableRef();

  if (table === tableRef) {
    knexBuilder.table(table);
  } else {
    knexBuilder.table(`${table} as ${tableRef}`);
  }
}

function setDefaultSelect(builder, knexBuilder) {
  const tableRef = builder.tableRef();

  knexBuilder.select(`${tableRef}.*`);
}

function chainHooks(promise, builder, func) {
  return promise.then(result => {
    let promise = Promise.resolve(result);

    if (isFunction(func)) {
      promise = promise.then(result => func.call(builder, result, builder));
    } else if (Array.isArray(func)) {
      func.forEach(func => {
        promise = chainHooks(promise, builder, func);
      });
    }

    return promise;
  });
}

function createModels(result, builder) {
  const modelClass = builder.resultModelClass();

  if (result === null || result === undefined) {
    return null;
  }

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
          'and only once per query builder.'
      )
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
    modelOptions: { patch: true }
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
  QueryBuilder
};
