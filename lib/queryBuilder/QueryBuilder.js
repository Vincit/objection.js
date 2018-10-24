const Bluebird = require('bluebird');

const { raw } = require('./RawBuilder');
const { createModifier } = require('../utils/createModifier');
const { Type: ValidationErrorType } = require('../model/ValidationError');
const { isObject, isString, isFunction, last } = require('../utils/objectUtils');
const { RelationExpression, DuplicateRelationError } = require('./RelationExpression');

const QueryBuilderContext = require('./QueryBuilderContext');
const QueryBuilderBase = require('./QueryBuilderBase');

const FindOperation = require('./operations/FindOperation');
const DeleteOperation = require('./operations/DeleteOperation');
const UpdateOperation = require('./operations/UpdateOperation');
const InsertOperation = require('./operations/InsertOperation');
const RelateOperation = require('./operations/RelateOperation');
const UnrelateOperation = require('./operations/UnrelateOperation');

const InsertGraphAndFetchOperation = require('./operations/InsertGraphAndFetchOperation');
const UpsertGraphAndFetchOperation = require('./operations/UpsertGraphAndFetchOperation');
const InsertAndFetchOperation = require('./operations/InsertAndFetchOperation');
const UpdateAndFetchOperation = require('./operations/UpdateAndFetchOperation');
const JoinRelationOperation = require('./operations/JoinRelationOperation');
const OnBuildKnexOperation = require('./operations/OnBuildKnexOperation');
const InsertGraphOperation = require('./operations/InsertGraphOperation');
const UpsertGraphOperation = require('./operations/UpsertGraphOperation');
const DeleteByIdOperation = require('./operations/DeleteByIdOperation');
const RunBeforeOperation = require('./operations/RunBeforeOperation');
const RunAfterOperation = require('./operations/RunAfterOperation');
const FindByIdOperation = require('./operations/FindByIdOperation');
const FindByIdsOperation = require('./operations/FindByIdsOperation');
const OnBuildOperation = require('./operations/OnBuildOperation');
const OnErrorOperation = require('./operations/OnErrorOperation');
const SelectOperation = require('./operations/select/SelectOperation');
const EagerOperation = require('./operations/eager/EagerOperation');
const RangeOperation = require('./operations/RangeOperation');
const FirstOperation = require('./operations/FirstOperation');
const FromOperation = require('./operations/FromOperation');
const KnexOperation = require('./operations/KnexOperation');

class QueryBuilder extends QueryBuilderBase {
  constructor(modelClass) {
    super(modelClass.knex());

    this._modelClass = modelClass;
    this._resultModelClass = null;
    this._explicitRejectValue = null;
    this._explicitResolveValue = null;

    this._eagerExpression = null;
    this._eagerModifiers = null;
    this._eagerModifiersAtPath = [];
    this._allowedEagerExpression = null;
    this._allowedUpsertExpression = null;

    this._findOperationOptions = modelClass.defaultFindOptions;
    this._eagerOperationOptions = modelClass.defaultEagerOptions;

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

  static get QueryBuilderContext() {
    return QueryBuilderContext;
  }

  tableNameFor(modelClassOrTableName, newTableName) {
    return super.tableNameFor(getTableName(modelClassOrTableName), newTableName);
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
      const id = new Array(idColumn.length);

      for (let i = 0, l = idColumn.length; i < l; ++i) {
        id[i] = `${tableName}.${idColumn[i]}`;
      }

      return id;
    } else {
      return `${tableName}.${idColumn}`;
    }
  }

  applyModifier() {
    for (let i = 0, l = arguments.length; i < l; ++i) {
      const modifier = createModifier({
        modifier: arguments[i],
        modelClass: this.modelClass()
      });

      modifier(this);
    }

    return this;
  }

  applyFilter() {
    return this.applyModifier.apply(this, arguments);
  }

  modify() {
    const arg = arguments[0];
    if (isFunction(arg)) {
      super.modify.apply(this, arguments);
    } else if (arg) {
      this.applyModifier.apply(this, arguments);
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

  eager(exp, modifiers) {
    this._eagerExpression = parseRelationExpression(this.modelClass(), exp);
    this._eagerModifiers = modifiers;

    checkEager(this);
    return this;
  }

  joinEager(exp, modifiers) {
    return this.eagerAlgorithm(this.modelClass().JoinEagerAlgorithm).eager(exp, modifiers);
  }

  naiveEager(exp, modifiers) {
    return this.eagerAlgorithm(this.modelClass().NaiveEagerAlgorithm).eager(exp, modifiers);
  }

  mergeEager(exp, modifiers) {
    if (!this._eagerExpression) {
      return this.eager(exp, modifiers);
    }

    this._eagerExpression = this._eagerExpression.merge(
      parseRelationExpression(this.modelClass(), exp)
    );

    this._eagerModifiers = Object.assign({}, this._eagerModifiers, modifiers);

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
    this._allowedEagerExpression = parseRelationExpression(this.modelClass(), exp);

    checkEager(this);
    return this;
  }

  allowedEagerExpression() {
    return this._allowedEagerExpression;
  }

  mergeAllowEager(exp) {
    if (!this._allowedEagerExpression) {
      return this.allowEager(exp);
    }

    this._allowedEagerExpression = this._allowedEagerExpression.merge(
      parseRelationExpression(this.modelClass(), exp)
    );

    checkEager(this);
    return this;
  }

  modifyEager(path, modifier) {
    this._eagerModifiersAtPath.push({ path, modifier });
    return this;
  }

  filterEager() {
    return this.modifyEager.apply(this, arguments);
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
    if (arguments.length !== 0) {
      this._eagerOperationOptions = Object.assign({}, this._eagerOperationOptions, opt);
      return this;
    } else {
      return this._eagerOperationOptions;
    }
  }

  findOptions(opt) {
    if (arguments.length !== 0) {
      this._findOperationOptions = Object.assign({}, this._findOperationOptions, opt);
      return this;
    } else {
      return this._findOperationOptions;
    }
  }

  modelClass() {
    return this._modelClass;
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
    return !!this._eagerExpression;
  }

  isSelectAll() {
    if (this._operations.length === 0) {
      return true;
    }

    const tableRef = this.tableRefFor(this.modelClass().getTableName());
    const tableName = this.tableNameFor(this.modelClass().getTableName());

    return this._operations.every(op => {
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
      } else if (op.name === 'as') {
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
      return this.build().toString();
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

    builder._eagerExpression = this._eagerExpression;
    builder._eagerModifiers = this._eagerModifiers;
    builder._eagerModifiersAtPath = this._eagerModifiersAtPath.slice();

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
    this._eagerModifiers = null;
    this._eagerModifiersAtPath = [];
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

  then(successHandler, errorHandler) {
    const promise = this.execute();
    return promise.then.apply(promise, arguments);
  }

  map(mapper) {
    const promise = this.execute();
    return promise.map.apply(promise, arguments);
  }

  reduce(reducer, initialValue) {
    const promise = this.execute();
    return promise.reduce.apply(promise, arguments);
  }

  catch(errorHandler) {
    const promise = this.execute();
    return promise.catch.apply(promise, arguments);
  }

  return(returnValue) {
    const promise = this.execute();
    return promise.return.apply(promise, arguments);
  }

  reflect() {
    const promise = this.execute();
    return promise.reflect();
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

    return countQuery.then(
      result => (result[0] && result[0].count ? parseInt(result[0].count, 10) : 0)
    );
  }

  build(knexBuilder) {
    // Take a clone so that we don't modify this instance during build.
    const builder = this.clone();

    if (builder.isFind()) {
      // If no write operations have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      addFindOperation(builder);
    }

    if (builder.hasEager()) {
      // If the query is an eager query, add the eager operation only at
      // this point of the query execution.
      addEagerFetchOperation(builder);
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
    return this.runAfter((result, builder) => {
      if (
        (Array.isArray(result) && result.length === 0) ||
        result === null ||
        result === undefined ||
        result === 0
      ) {
        throw this.modelClass().createNotFoundError(builder.context());
      } else {
        return result;
      }
    });
  }

  findSelection(selection, explicit) {
    explicit = explicit == null ? false : explicit;

    const table = this.tableRefFor(this.modelClass().getTableName());
    let noSelectStatements = true;

    for (let i = 0, l = this._operations.length; i < l; ++i) {
      const op = this._operations[i];

      if (op.constructor === SelectOperation) {
        const selectionObj = op.findSelection(selection, table);
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

  findAllSelections() {
    return this._operations
      .filter(op => op.is(SelectOperation))
      .reduce((selects, op) => selects.concat(op.selections), []);
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

  insertWithRelated() {
    return this.insertGraph.apply(this, arguments);
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

  upsertGraphAndFetch(modelsOrObjects, opt) {
    return writeOperation(this, () => {
      const insertOperation = this._insertOperationFactory(this);

      const upsertGraphOperation = new UpsertGraphOperation('upsertGraph', {
        delegate: insertOperation,
        opt
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

  delete() {
    return writeOperation(this, () => {
      if (arguments.length) {
        throw new Error(
          `Don't pass arguments to delete(). You should use it like this: delete().where('foo', 'bar').andWhere(...)`
        );
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
        throw new Error(
          `Don't pass arguments to unrelate(). You should use it like this: unrelate().where('foo', 'bar').andWhere(...)`
        );
      }

      const unrelateOperation = this._unrelateOperationFactory(this);
      this.addOperation(unrelateOperation, arguments);
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

  findOne() {
    return this.where.apply(this, arguments).first();
  }

  range() {
    return this.addOperation(new RangeOperation('range'), arguments);
  }

  first() {
    return this.addOperation(new FirstOperation('first'), arguments);
  }

  joinRelation() {
    return this.addOperation(
      new JoinRelationOperation('joinRelation', { joinOperation: 'join' }),
      arguments
    );
  }

  innerJoinRelation() {
    return this.addOperation(
      new JoinRelationOperation('innerJoinRelation', { joinOperation: 'innerJoin' }),
      arguments
    );
  }

  outerJoinRelation() {
    return this.addOperation(
      new JoinRelationOperation('outerJoinRelation', { joinOperation: 'outerJoin' }),
      arguments
    );
  }

  leftJoinRelation() {
    return this.addOperation(
      new JoinRelationOperation('leftJoinRelation', { joinOperation: 'leftJoin' }),
      arguments
    );
  }

  leftOuterJoinRelation() {
    return this.addOperation(
      new JoinRelationOperation('leftOuterJoinRelation', { joinOperation: 'leftOuterJoin' }),
      arguments
    );
  }

  rightJoinRelation() {
    return this.addOperation(
      new JoinRelationOperation('rightJoinRelation', { joinOperation: 'rightJoin' }),
      arguments
    );
  }

  rightOuterJoinRelation() {
    return this.addOperation(
      new JoinRelationOperation('rightOuterJoinRelation', { joinOperation: 'rightOuterJoin' }),
      arguments
    );
  }

  fullOuterJoinRelation() {
    return this.addOperation(
      new JoinRelationOperation('fullOuterJoinRelation', { joinOperation: 'fullOuterJoin' }),
      arguments
    );
  }

  deleteById() {
    return this.addOperation(new DeleteByIdOperation('deleteById'), arguments);
  }

  findById() {
    return this.addOperation(new FindByIdOperation('findById'), arguments);
  }

  findByIds() {
    return this.addOperation(new FindByIdsOperation('findByIds'), arguments);
  }

  runBefore() {
    return this.addOperation(new RunBeforeOperation('runBefore'), arguments);
  }

  onBuild() {
    return this.addOperation(new OnBuildOperation('onBuild'), arguments);
  }

  onBuildKnex() {
    return this.addOperation(new OnBuildKnexOperation('onBuildKnex'), arguments);
  }

  runAfter() {
    return this.addOperation(new RunAfterOperation('runAfter'), arguments);
  }

  onError() {
    return this.addOperation(new OnErrorOperation('onError'), arguments);
  }

  from() {
    return this.addOperation(new FromOperation('from'), arguments);
  }

  table() {
    return this.addOperation(new FromOperation('table'), arguments);
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
  const expr = builder._eagerExpression;
  const allowedExpr = builder._allowedEagerExpression;

  if (expr && allowedExpr && !allowedExpr.isSubExpression(expr)) {
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
  for (let i = 0, l = builder._operations.length; i < l; ++i) {
    const op = builder._operations[i];

    if (op.hasQueryExecutor()) {
      return op;
    }
  }

  return null;
}

function beforeExecute(builder) {
  let promise = Promise.resolve();

  if (builder.isFind()) {
    // If no write operations have been called at this point this query is a
    // find query and we need to call the custom find implementation.
    addFindOperation(builder);
  }

  if (builder.hasEager()) {
    // If the query is an eager query, add the eager operation only at
    // this point of the query execution.
    addEagerFetchOperation(builder);
  }

  // Resolve all before hooks before building and executing the query
  // and the rest of the hooks.
  builder._operations.forEach(op => {
    if (op.hasOnBefore1()) {
      promise = promise.then(result => op.onBefore1(builder, result));
    }
  });

  promise = chainHooks(promise, builder, builder.context().runBefore);
  promise = chainHooks(promise, builder, builder.internalContext().runBefore);

  builder._operations.forEach(op => {
    if (op.hasOnBefore2()) {
      promise = promise.then(result => op.onBefore2(builder, result));
    }
  });

  builder._operations.forEach(op => {
    if (op.hasOnBefore3()) {
      promise = promise.then(result => op.onBefore3(builder, result));
    }
  });

  return promise;
}

function doExecute(builder) {
  let promise = Promise.resolve();

  const knexBuilder = buildInto(builder, builder.knex().queryBuilder());
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
    promise = Promise.resolve(knexBuilder);

    builder._operations.forEach(op => {
      if (op.hasOnRawResult()) {
        promise = promise.then(result => op.onRawResult(builder, result));
      }
    });

    promise = promise.then(result => createModels(result, builder));
  }

  return promise;
}

function afterExecute(builder, result) {
  let promise = Promise.resolve(result);

  builder._operations.forEach(op => {
    if (op.hasOnAfter1()) {
      promise = promise.then(result => op.onAfter1(builder, result));
    }
  });

  builder._operations.forEach(op => {
    if (op.hasOnAfter2()) {
      promise = promise.then(result => op.onAfter2(builder, result));
    }
  });

  promise = chainHooks(promise, builder, builder.context().runAfter);
  promise = chainHooks(promise, builder, builder.internalContext().runAfter);

  builder._operations.forEach(op => {
    if (op.hasOnAfter3()) {
      promise = promise.then(result => op.onAfter3(builder, result));
    }
  });

  return promise;
}

function handleExecuteError(builder, err) {
  let promise = Promise.reject(err);

  builder._operations.forEach(op => {
    if (op.hasOnError()) {
      promise = promise.catch(err => op.onError(builder, err));
    }
  });

  return promise;
}

function addFindOperation(builder) {
  if (!builder.has(FindOperation)) {
    const operation = builder._findOperationFactory(builder);
    builder.addOperationToFront(operation, []);
  }
}

function addEagerFetchOperation(builder) {
  if (!builder.has(EagerOperation) && builder._eagerExpression) {
    const operation = builder._eagerOperationFactory(builder);
    const expression = builder._eagerExpression.clone();
    const modifiers = Object.assign({}, builder._eagerModifiers);

    builder._eagerModifiersAtPath.forEach((modifier, i) => {
      const modifierName = `_f${i}_`;

      expression.expressionsAtPath(modifier.path).forEach(expr => {
        expr.rawNode.$modify.push(modifierName);
      });

      modifiers[modifierName] = modifier.modifier;
    });

    builder.addOperation(operation, [expression, modifiers]);
  }
}

function buildInto(builder, knexBuilder) {
  callOnBuildHooks(builder, builder.context().onBuild);
  callOnBuildHooks(builder, builder.internalContext().onBuild);

  // Call super class build.
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

function callOnBuildHooks(builder, func) {
  if (isFunction(func)) {
    func.call(builder, builder);
  } else if (Array.isArray(func)) {
    func.forEach(func => callOnBuildHooks(builder, func));
  }
}

function setDefaultTable(builder, knexBuilder) {
  const table = builder.tableNameFor(builder.modelClass().getTableName());
  const tableRef = builder.tableRefFor(builder.modelClass().getTableName());

  if (table === tableRef) {
    knexBuilder.table(table);
  } else {
    knexBuilder.table(`${table} as ${tableRef}`);
  }
}

function setDefaultSelect(builder, knexBuilder) {
  const tableRef = builder.tableRefFor(builder.modelClass().getTableName());

  knexBuilder.select(`${tableRef}.*`);
}

function chainHooks(promise, builder, func) {
  if (isFunction(func)) {
    promise = promise.then(result => func.call(builder, result, builder));
  } else if (Array.isArray(func)) {
    func.forEach(func => {
      promise = chainHooks(promise, builder, func);
    });
  }

  return promise;
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

module.exports = QueryBuilder;
