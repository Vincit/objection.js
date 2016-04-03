import _ from 'lodash';
import Promise from 'bluebird';
import RelationExpression from './RelationExpression';
import InsertionOrUpdate from './InsertionOrUpdate';
import InsertWithRelated from './InsertWithRelated';
import QueryBuilderBase from './QueryBuilderBase';
import ValidationError from '../ValidationError';
import EagerFetcher from './EagerFetcher';
import {isPostgres} from '../utils/dbUtils';
import deprecated from '../utils/decorators/deprecated';

export default class QueryBuilder extends QueryBuilderBase {

  constructor(modelClass) {
    super(modelClass.knex());

    this._modelClass = modelClass;
    this._calledWriteMethod = null;
    this._explicitRejectValue = null;
    this._explicitResolveValue = null;

    this._hooks = null;
    this._customImpl = null;

    this._eagerExpression = null;
    this._eagerFilters = null;
    this._eagerFilterExpressions = [];
    this._allowedEagerExpression = null;
    this._allowedInsertExpression = null;

    this.internalContext().runBefore = [];
    this.internalContext().runAfter = [];
    this.internalContext().onBuild = [];

    this.clearHooks();
    this.clearCustomImpl();
  }

  /**
   * @param {Model} modelClass
   * @returns {QueryBuilder}
   */
  static forClass(modelClass) {
    return new this(modelClass);
  }

  /**
   * @param {Object=} ctx
   * @returns {QueryBuilder|Object}
   */
  context(...args) {
    // This implementation is here just so that we can document it.
    return super.context(...args);
  }

  /**
   * @param {QueryBuilderBase} query
   */
  childQueryOf(query) {
    if (query) {
      this.internalContext(query.internalContext());

      if (query.has(/debug/)) {
        this.debug();
      }
    }
    return this;
  }

  /**
   * @param {Error} error
   * @returns {QueryBuilder}
   */
  reject(error) {
    this._explicitRejectValue = error;
    return this;
  }

  /**
   * @param {*} value
   * @returns {QueryBuilder}
   */
  resolve(value) {
    this._explicitResolveValue = value;
    return this;
  }

  /**
   * @returns {boolean}
   */
  isExecutable() {
    return !this._explicitRejectValue && !this._explicitResolveValue && !this._hooks.executor;
  }

  /**
   * @param {function(*, QueryBuilder)} runBefore
   * @returns {QueryBuilder}
   */
  runBefore(runBefore) {
    this._hooks.before.push(runBefore);
    return this;
  }

  /**
   * @param {function(*, QueryBuilder)} runBefore
   * @returns {QueryBuilder}
   */
  runBeforePushFront(runBefore) {
    this._hooks.before.unshift(runBefore);
    return this;
  }

  /**
   * @param {function(QueryBuilder)} onBuild
   * @returns {QueryBuilder}
   */
  onBuild(onBuild) {
    this._hooks.onBuild.push(onBuild);
    return this;
  }

  /**
   * @param {function(QueryBuilder)} executor
   * @returns {QueryBuilder}
   */
  setQueryExecutor(executor) {
    if (this._hooks.executor) {
      throw Error('overwriting an executor. you should not do this.');
    }

    this._hooks.executor = executor;
    return this;
  }

  /**
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfterModelCreate
   * @returns {QueryBuilder}
   */
  runAfterModelCreate(runAfterModelCreate) {
    this._hooks.afterModelCreate.push(runAfterModelCreate);
    return this;
  }

  /**
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfterModelCreate
   * @returns {QueryBuilder}
   */
  runAfterModelCreatePushFront(runAfterModelCreate) {
    this._hooks.afterModelCreate.unshift(runAfterModelCreate);
    return this;
  }

  /**
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfter
   * @returns {QueryBuilder}
   */
  runAfter(runAfter) {
    this._hooks.after.push(runAfter);
    return this;
  }

  /**
   * @param {function(Model|Array.<Model>, QueryBuilder)} runAfter
   * @returns {QueryBuilder}
   */
  runAfterPushFront(runAfter) {
    this._hooks.after.unshift(runAfter);
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  findImpl(findImpl) {
    this._customImpl.find = findImpl || null;
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  insertImpl(insertImpl) {
    this._customImpl.insert = insertImpl || null;
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  updateImpl(updateImpl) {
    this._customImpl.update = updateImpl || null;
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  patchImpl(patchImpl) {
    this._customImpl.patch = patchImpl || null;
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  deleteImpl(deleteImpl) {
    this._customImpl.delete = deleteImpl || null;
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  relateImpl(relateImpl) {
    this._customImpl.relate = relateImpl || null;
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  unrelateImpl(unrelateImpl) {
    this._customImpl.unrelate = unrelateImpl || null;
    return this;
  }

  /**
   * @param {string|RelationExpression} exp
   * @param {Object.<string, function(QueryBuilder)>=} filters
   * @returns {QueryBuilder}
   */
  eager(exp, filters) {
    this._eagerExpression = exp || null;
    this._eagerFilters = filters || null;

    if (_.isString(this._eagerExpression)) {
      this._eagerExpression = RelationExpression.parse(this._eagerExpression);
    }

    checkEager(this);
    return this;
  }

  /**
   * @param {string|RelationExpression} exp
   * @returns {QueryBuilder}
   */
  allowEager(exp) {
    this._allowedEagerExpression = exp || null;

    if (_.isString(this._allowedEagerExpression)) {
      this._allowedEagerExpression = RelationExpression.parse(this._allowedEagerExpression);
    }

    checkEager(this);
    return this;
  }

  /**
   * @param {string|RelationExpression} path
   * @param {function(QueryBuilder)} filter
   * @returns {QueryBuilder}
   */
  filterEager(path, filter) {
    this._eagerFilterExpressions.push({
      path: path,
      filter: filter
    });

    return this;
  }

  /**
   * @param {string|RelationExpression} exp
   * @returns {QueryBuilder}
   */
  allowInsert(exp) {
    this._allowedInsertExpression = exp || null;

    if (_.isString(this._allowedInsertExpression)) {
      this._allowedInsertExpression = RelationExpression.parse(this._allowedInsertExpression);
    }

    return this;
  }

  /**
   * @returns {Model}
   */
  modelClass() {
    return this._modelClass;
  }

  /**
   * @returns {boolean}
   */
  isFindQuery() {
    return !this._calledWriteMethod && !this.has(/insert|update|delete/);
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
   * @param {function(string)=} logger
   * @returns {QueryBuilder}
   */
  @deprecated({removedIn: '0.6.0', useInstead: 'debug()'})
  dumpSql(logger) {
    (logger || console.log)(this.toString());
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  clone() {
    let builder = new this.constructor(this._modelClass);
    // This is a QueryBuilderBase method.
    this.cloneInto(builder);

    let builderIntCtx = builder.internalContext();
    let intCtx = this.internalContext();

    builderIntCtx.runBefore = intCtx.runBefore.slice();
    builderIntCtx.runAfter = intCtx.runAfter.slice();
    builderIntCtx.onBuild = intCtx.onBuild.slice();

    builder._calledWriteMethod = this._calledWriteMethod;
    builder._explicitRejectValue = this._explicitRejectValue;
    builder._explicitResolveValue = this._explicitResolveValue;

    _.forEach(this._hooks, (funcs, key) => {
      builder._hooks[key] = _.isArray(funcs) ? funcs.slice() : funcs;
    });

    _.forEach(this._customImpl, (impl, key) => {
      builder._customImpl[key] = impl;
    });

    builder._eagerExpression = this._eagerExpression;
    builder._eagerFilters = this._eagerFilters;
    builder._eagerFilterExpressions = this._eagerFilterExpressions.slice();
    builder._allowedEagerExpression = this._allowedEagerExpression;
    builder._allowedInsertExpression = this._allowedInsertExpression;

    return builder;
  }

  /**
   * @returns {QueryBuilder}
   */
  clearCustomImpl() {
    this._customImpl = {
      find() {},
      relate() {},
      unrelate() {},
      insert(insert, builder) {
        builder.onBuild(builder => {
          builder.$$insert(insert);
        });
      },
      update(update, builder) {
        builder.onBuild(builder => {
          builder.$$update(update);
        });
      },
      patch(patch, builder) {
        builder.onBuild(builder => {
          builder.$$update(patch);
        });
      },
      delete(builder) {
        builder.onBuild(builder => {
          builder.$$delete();
        });
      }
    };

    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  clearHooks() {
    this._hooks = {
      before: [],
      onBuild: [],
      executor: null,
      afterModelCreate: [],
      after: []
    };

    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  clearEager() {
    this._eagerExpression = null;
    this._eagerFilters = null;
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  clearReject() {
    this._explicitRejectValue = null;
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  clearResolve() {
    this._explicitResolveValue = null;
    return this;
  }

  /**
   * @param {RegExp=} regex
   * @returns {QueryBuilder}
   */
  clear(regex) {
    super.clear(regex);

    if (regex) {
      // Clear the write method call also if it doesn't pass the filter.
      if (regex.test(this._calledWriteMethod)) {
        this._calledWriteMethod = null;
      }
    } else {
      this._calledWriteMethod = null;
    }

    return this;
  }

  /**
   * @param {RegExp} methodNameRegex
   * @returns {boolean}
   */
  has(methodNameRegex) {
    return super.has(methodNameRegex) || methodNameRegex.test(this._calledWriteMethod);
  }

  /**
   * @param {function=} successHandler
   * @param {function=} errorHandler
   * @returns {Promise}
   */
  then() {
    var promise = this._execute();
    return promise.then.apply(promise, arguments);
  }

  /**
   * @param {function} mapper
   * @returns {Promise}
   */
  map() {
    var promise = this._execute();
    return promise.map.apply(promise, arguments);
  }

  /**
   * @param {function} errorHandler
   * @returns {Promise}
   */
  catch() {
    var promise = this._execute();
    return promise.catch.apply(promise, arguments);
  }

  /**
   * @param {*} returnValue
   * @returns {Promise}
   */
  return() {
    var promise = this._execute();
    return promise.return.apply(promise, arguments);
  }

  /**
   * @param {*} context
   * @returns {Promise}
   */
  bind() {
    var promise = this._execute();
    return promise.bind.apply(promise, arguments);
  }

  /**
   * @param {function} callback
   * @returns {Promise}
   */
  asCallback() {
    var promise = this._execute();
    return promise.asCallback.apply(promise, arguments);
  }

  /**
   * @param {function} callback
   * @returns {Promise}
   */
  nodeify(/*callback*/) {
    var promise = this._execute();
    return promise.nodeify.apply(promise, arguments);
  }

  /**
   * @returns {Promise}
   */
  resultSize() {
    const knex = this._modelClass.knex();

    // orderBy is useless here and it can make things a lot slower (at least with postgresql 9.3).
    // Remove it from the count query. We also remove the offset and limit
    let query = this.clone().clear(/orderBy|offset|limit/).build();
    let rawQuery = knex.raw(query).wrap('(', ') as temp');
    let countQuery = knex.count('* as count').from(rawQuery);

    return countQuery.then(result => result[0] ? result[0].count : 0);
  }

  /**
   * @param {number} page
   * @param {number} pageSize
   * @returns {QueryBuilder}
   */
  page(page, pageSize) {
    return this.range(page * pageSize, (page + 1) * pageSize - 1);
  }

  /**
   * @param {number} start
   * @param {number} end
   * @returns {QueryBuilder}
   */
  range(start, end) {
    const self = this;
    let resultSizePromise;

    return this
      .limit(end - start + 1)
      .offset(start)
      .runBefore(() => {
        // Don't return the promise so that it is executed
        // in parallel with the actual query.
        resultSizePromise = self.resultSize();
      })
      .runAfter(results => {
        // Now that the actual query is finished, wait until the
        // result size has been calculated.
        return Promise.all([results, resultSizePromise]);
      })
      .runAfter(arr => {
        return {
          results: arr[0],
          total: _.parseInt(arr[1])
        };
      });
  };

  /**
   * @returns {knex.QueryBuilder}
   */
  build() {
    let builder = this.clone();

    if (builder.isFindQuery()) {
      // If no write methods have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._customImpl.find.call(builder, builder);
    }

    // We need to build the builder even if the _hooks.executor function
    // has been defined so that the onBuild hooks get called.
    let knexBuilder = build(builder);

    if (_.isFunction(builder._hooks.executor)) {
      // If the query executor is set, we build the builder that it returns.
      return builder._hooks.executor.call(builder, builder).build();
    } else {
      return knexBuilder;
    }
  }

  /**
   * @returns {Promise}
   */
  _execute() {
    // Take a clone so that we don't modify this instance during execution.
    // The hooks and onBuild callbacks usually modify the query and we want
    // this builder to be re-executable.
    let builder = this.clone();
    let promise = Promise.resolve();
    let context = builder.context() || {};
    let internalContext = builder.internalContext();

    if (builder.isFindQuery()) {
      // If no write methods have been called at this point this query is a
      // find query and we need to call the custom find implementation.
      builder._customImpl.find.call(builder, builder);
    }

    promise = chainBuilderFuncs(promise, builder, context.runBefore);
    promise = chainBuilderFuncs(promise, builder, internalContext.runBefore);
    promise = chainBuilderFuncs(promise, builder, builder._hooks.before);

    // Resolve all before hooks before building and executing the query
    // and the rest of the hooks.
    return promise.then(() => {
      // We need to build the builder even if the _explicit(Resolve|Reject)Value or _hooks.executor
      // has been defined so that the onBuild hooks get called.
      let knexBuilder = build(builder);
      let promise;

      if (builder._explicitResolveValue) {
        promise = Promise.resolve(builder._explicitResolveValue);
      } else if (builder._explicitRejectValue) {
        promise = Promise.reject(builder._explicitRejectValue);
      } else if (_.isFunction(builder._hooks.executor)) {
        promise = builder._hooks.executor.call(builder, builder);
      } else {
        promise = knexBuilder.then(result => createModels(builder, result));
      }

      promise = chainBuilderFuncs(promise, builder, builder._hooks.afterModelCreate);

      if (builder._eagerExpression) {
        promise = promise.then(models => eagerFetch(builder, models));
      }

      promise = chainBuilderFuncs(promise, builder, context.runAfter);
      promise = chainBuilderFuncs(promise, builder, internalContext.runAfter);
      promise = chainBuilderFuncs(promise, builder, builder._hooks.after);

      return promise;
    });
  }

  /**
   * @param {string} propertyName
   * @returns {QueryBuilder}
   */
  pluck(propertyName) {
    return this.runAfter(result => {
      if (_.isArray(result)) {
        return _.pluck(result, propertyName);
      } else {
        return result;
      }
    });
  }

  /**
   * @returns {QueryBuilder}
   */
  first() {
    return this.runAfter(result => {
      if (_.isArray(result)) {
        return result[0];
      } else {
        return result;
      }
    });
  }

  /**
   * @param {Constructor.<Model>=} modelClass
   * @param {function(Model, Model, string)} traverser
   * @returns {QueryBuilder}
   */
  traverse(modelClass, traverser) {
    var self = this;

    if (_.isUndefined(traverser)) {
      traverser = modelClass;
      modelClass = null;
    }

    return this.runAfter(result => {
      self._modelClass.traverse(modelClass, result, traverser);
      return result;
    });
  }

  /**
   * @param {Constructor.<Model>=} modelClass
   * @param {Array.<string>} properties
   * @returns {QueryBuilder}
   */
  pick(modelClass, properties) {
    if (_.isUndefined(properties)) {
      properties = modelClass;
      modelClass = null;
    }

    properties = _.reduce(properties, (obj, prop) => {
      obj[prop] = true;
      return obj;
    }, {});

    return this.traverse(modelClass, model => {
      model.$pick(properties);
    });
  }

  /**
   * @param {Constructor.<Model>=} modelClass
   * @param {Array.<string>} properties
   * @returns {QueryBuilder}
   */
  omit(modelClass, properties) {
    if (_.isUndefined(properties)) {
      properties = modelClass;
      modelClass = null;
    }

    // Turn the properties into a hash for performance.
    properties = _.reduce(properties, (obj, prop) => {
      obj[prop] = true;
      return obj;
    }, {});

    return this.traverse(modelClass, model => {
      model.$omit(properties);
    });
  }

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  joinRelation(relationName) {
    return this.$$joinRelation(relationName, 'join');
  }

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  innerJoinRelation(relationName) {
    return this.$$joinRelation(relationName, 'innerJoin');
  }

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  outerJoinRelation(relationName) {
    return this.$$joinRelation(relationName, 'outerJoin');
  }

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  leftJoinRelation(relationName) {
    return this.$$joinRelation(relationName, 'leftJoin');
  }

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  leftOuterJoinRelation(relationName) {
    return this.$$joinRelation(relationName, 'leftOuterJoin');
  }

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  rightJoinRelation(relationName) {
    return this.$$joinRelation(relationName, 'rightJoin');
  }

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  rightOuterJoinRelation(relationName) {
    return this.$$joinRelation(relationName, 'rightOuterJoin');
  }

  /**
   * @param {string} relationName
   * @returns {QueryBuilder}
   */
  fullOuterJoinRelation(relationName) {
    return this.$$joinRelation(relationName, 'fullOuterJoin');
  }

  /**
   * @private
   */
  $$joinRelation(relationName, joinMethod) {
    let relation = this._modelClass.getRelation(relationName);
    relation.join(this, joinMethod, relation.name);
    return this;
  }

  /**
   * @param {string|number|Array.<string|number>} id
   * @returns {QueryBuilder}
   */
  findById(id) {
    return this.whereComposite(this._modelClass.getFullIdColumn(), id).first();
  }

  /**
   * @returns {QueryBuilder}
   */
  withSchema(schema) {
    this.internalContext().onBuild.push((builder) => {
      if (!builder.has(/withSchema/)) {
        // If the builder already has a schema, don't override it.
        builder.callKnexMethod('withSchema', [schema]);
      }
    });

    return this;
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  insert(modelsOrObjects) {
    const ModelClass = this._modelClass;

    let insertion = new InsertionOrUpdate({
      ModelClass,
      modelsOrObjects
    });

    this.$$callWriteMethodImpl('insert', [insertion, this]);

    this.runBefore((result, builder) => {
      if (insertion.models().length > 1 && !isPostgres(ModelClass.knex())) {
        throw new Error('batch insert only works with Postgresql');
      } else {
        return Promise.map(insertion.models(), model => model.$beforeInsert(builder.context()));
      }
    });

    this.onBuild(builder => {
      if (!builder.has(/returning/)) {
        // If the user hasn't specified a `returning` clause, we make sure
        // that at least the identifier is returned.
        builder.returning(ModelClass.idColumn);
      }
    });

    this.runAfterModelCreatePushFront(ret => {
      if (!_.isArray(ret) || _.isEmpty(ret)) {
        // Early exit if there is nothing to do.
        return insertion.models();
      }

      // If the user specified a `returning` clause the result may already bean array of objects.
      if (_.all(ret, _.isObject)) {
        _.forEach(insertion.models(), (model, index) => {
          model.$set(ret[index]);
        });
      } else {
        // If the return value is not an array of objects, we assume it is an array of identifiers.
        _.forEach(insertion.models(), (model, idx) => {
          // Don't set the id if the model already has one. MySQL and Sqlite don't return the correct
          // primary key value if the id is not generated in db, but given explicitly.
          if (!model.$id()) {
            model.$id(ret[idx]);
          }
        });
      }

      return insertion.models();
    });

    this.runAfterModelCreate((models, builder) => {
      return Promise.map(models, model => {
        return model.$afterInsert(builder.context());
      }).then(() => {
        if (insertion.isArray()) {
          return models;
        } else {
          return models[0] || null;
        }
      });
    });

    return this;
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  insertAndFetch(modelsOrObjects) {
    const ModelClass = this._modelClass;

    return this.insert(modelsOrObjects).runAfterModelCreate((insertedModels, builder) => {
      let insertedModelArray = _.isArray(insertedModels) ? insertedModels : [insertedModels];

      return ModelClass
        .query()
        .childQueryOf(builder)
        .whereInComposite(ModelClass.getFullIdColumn(), _.map(insertedModelArray, model => model.$id()))
        .then(fetchedModels => {
          fetchedModels = _.indexBy(fetchedModels, (model) => model.$id());

          // Instead of returning the freshly fetched models, update the input
          // models with the fresh values.
          _.forEach(insertedModelArray, insertedModel => {
            insertedModel.$set(fetchedModels[insertedModel.$id()]);
          });

          return insertedModels;
        });
    });
  }

  /**
   * @param {Object|Model|Array.<Object>|Array.<Model>} modelsOrObjects
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  insertWithRelated(modelsOrObjects) {
    const ModelClass = this._modelClass;
    const batchSize = isPostgres(ModelClass.knex()) ? 100 : 1;

    let insertion = new InsertionOrUpdate({
      ModelClass,
      modelsOrObjects,
      // We need to skip validation at this point because the models may contain
      // references and special properties. We validate the models upon insertion.
      modelOptions: {skipValidation: true}
    });

    this.$$callWriteMethodImpl('insert', [insertion, this]);

    // We resolve this query here and will not execute it. This is because the root
    // value may depend on other models in the graph and cannot be inserted first.
    this.resolve([]);

    this.runAfterModelCreatePushFront((result, builder) => {
      let inserter = new InsertWithRelated({
        modelClass: ModelClass,
        models: insertion.models(),
        allowedRelations: builder._allowedInsertExpression || null
      });

      return inserter.execute(tableInsertion => {
        let insertQuery = tableInsertion.modelClass.query().childQueryOf(builder);

        // We skipped the validation above. We need to validate here since at this point
        // the models should no longer contain any special properties.
        _.forEach(tableInsertion.models, model => {
          model.$validate();
        });

        let inputs = _.filter(tableInsertion.models, (model, idx) => {
          return tableInsertion.isInputModel[idx];
        });

        let others = _.filter(tableInsertion.models, (model, idx) => {
          return !tableInsertion.isInputModel[idx];
        });

        return Promise.all(_.flatten([
          batchInsert(inputs, insertQuery.clone().copyFrom(builder, /returning/), batchSize),
          batchInsert(others, insertQuery.clone(), batchSize)
        ]));
      });
    });

    this.runAfterModelCreate(models => {
      if (insertion.isArray()) {
        return models
      } else {
        return _.first(models) || null;
      }
    });
  }

  /**
   * @returns {QueryBuilder}
   */
  $$insert(insertion) {
    let input = insertion;

    if (insertion instanceof InsertionOrUpdate) {
      insertion = insertion.models();
    }

    if (_.isArray(insertion)) {
      input = _.map(insertion, obj => {
        if (_.isFunction(obj.$toDatabaseJson)) {
          return obj.$toDatabaseJson();
        } else {
          return obj;
        }
      });
    } else if (_.isFunction(insertion.$toDatabaseJson)) {
      input = insertion.$toDatabaseJson();
    }

    return super.insert(input);
  }

  /**
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  update(modelOrObject) {
    return this.$$updateWithOptions(modelOrObject, 'update', {});
  }

  /**
   * @param {number|string|Array.<number|string>} id
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  updateAndFetchById(id, modelOrObject) {
    return this
      .$$updateWithOptions(modelOrObject, 'update', {}, id)
      .whereComposite(this._modelClass.getFullIdColumn(), id);
  }

  /**
   * @private
   */
  @writeQueryMethod
  $$updateWithOptions(modelOrObject, method, modelOptions, fetchId) {
    const ModelClass = this._modelClass;

    let update = new InsertionOrUpdate({
      ModelClass,
      modelOptions,
      modelsOrObjects: modelOrObject
    });

    this.$$callWriteMethodImpl(method, [update, this]);

    this.runBefore((result, builder) => {
      return update.model().$beforeUpdate(modelOptions, builder.context());
    });

    this.runAfterModelCreate((numUpdated, builder) => {
      let promise;

      if (fetchId) {
        promise = ModelClass
          .query()
          .first()
          .childQueryOf(builder)
          .whereComposite(ModelClass.getFullIdColumn(), fetchId)
          .then(model => model ? update.model().$set(model) : null);
      } else {
        promise = Promise.resolve(numUpdated);
      }

      return promise.then(result => {
        return [result, update.model().$afterUpdate(modelOptions, builder.context())];
      }).spread(function (result) {
        return result;
      });
    });

    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  $$update(update) {
    let input = update;
    let idColumn = this._modelClass.idColumn;

    if (update instanceof InsertionOrUpdate) {
      update = update.model();
    }

    if (_.isFunction(update.$toDatabaseJson)) {
      input = update.$toDatabaseJson();
    }

    // We never want to update the identifier.
    // TODO: Maybe we do?
    if (_.isArray(idColumn)) {
      _.each(idColumn, col => {
        delete input[col]
      });
    } else {
      delete input[idColumn];
    }

    return super.update(input);
  }

  /**
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  patch(modelOrObject) {
    return this.$$updateWithOptions(modelOrObject, 'patch', {patch: true});
  }

  /**
   * @param {number|string|Array.<number|string>} id
   * @param {Model|Object=} modelOrObject
   * @returns {QueryBuilder}
   */
  patchAndFetchById(id, modelOrObject) {
    return this
      .$$updateWithOptions(modelOrObject, 'patch', {patch: true}, id)
      .whereComposite(this._modelClass.getFullIdColumn(), id);
  }

  /**
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  delete() {
    this.$$callWriteMethodImpl('delete', [this]);
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  del() {
    return this.delete();
  }

  /**
   * @param {number|string|Array.<number|string>} id
   * @returns {QueryBuilder}
   */
  deleteById(id) {
    return this.delete().whereComposite(this._modelClass.getFullIdColumn(), id);
  }

  /**
   * @returns {QueryBuilder}
   */
  $$delete() {
    return super.delete();
  }

  /**
   * @param {number|string|object|Array.<number|string>|Array.<Array.<number|string>>|Array.<object>} ids
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  relate(ids) {
    this.$$callWriteMethodImpl('relate', [ids, this]);
    return this.runAfterModelCreate(() => ids);
  }

  /**
   * @returns {QueryBuilder}
   */
  @writeQueryMethod
  unrelate() {
    this.$$callWriteMethodImpl('unrelate', [this]);
    this.runAfterModelCreate(() => { return {}; });
    return this;
  }

  /**
   * @returns {QueryBuilder}
   */
  increment(propertyName, howMuch) {
    let patch = {};
    let columnName = this._modelClass.propertyNameToColumnName(propertyName);
    patch[propertyName] = this._modelClass.knex().raw('?? + ?', [columnName, howMuch]);
    return this.patch(patch);
  }

  /**
   * @returns {QueryBuilder}
   */
  decrement(propertyName, howMuch) {
    let patch = {};
    let columnName = this._modelClass.propertyNameToColumnName(propertyName);
    patch[propertyName] = this._modelClass.knex().raw('?? - ?', [columnName, howMuch]);
    return this.patch(patch);
  }

  /**
   * @private
   */
  $$callWriteMethodImpl(method, args) {
    this._calledWriteMethod = 'method';
    return this._customImpl[method].apply(this, args);
  }
}

function writeQueryMethod(target, property, descriptor) {
  descriptor.value = tryCallWriteMethod(descriptor.value);
}

function tryCallWriteMethod(func) {
  return function () {
    if (this._calledWriteMethod) {
      this.reject(new Error('Double call to a write method. ' +
        'You can only call one of the write methods ' +
        '(insert, update, patch, delete, relate, unrelate, increment, decrement) ' +
        'and only once per query builder.'));
      return this;
    }

    try {
      func.apply(this, arguments);
    } catch (err) {
      this.reject(err);
    }

    return this;
  };
}

function checkEager(builder) {
  if (builder._eagerExpression && builder._allowedEagerExpression) {
    if (!builder._allowedEagerExpression.isSubExpression(builder._eagerExpression)) {
      builder.reject(new ValidationError({eager: 'eager expression not allowed'}));
    }
  }
}

function createModels(builder, result) {
  if (_.isNull(result) || _.isUndefined(result)) {
    return null;
  }

  if (_.isArray(result)) {
    if (result.length > 0 && _.isObject(result[0])) {
      for (let i = 0, l = result.length; i < l; ++i) {
        result[i] = builder._modelClass.fromDatabaseJson(result[i]);
      }
    }
  } else if (_.isObject(result)) {
    result = builder._modelClass.fromDatabaseJson(result);
  }

  return result;
}

function eagerFetch(builder, $models) {
  if ($models instanceof builder._modelClass || (_.isArray($models) && $models[0] instanceof builder._modelClass)) {
    let expression = builder._eagerExpression.clone();
    let filters = _.clone(builder._eagerFilters || {});

    _.each(builder._eagerFilterExpressions, (filter, idx) => {
      let filterNodes = expression.expressionsAtPath(filter.path);

      if (!_.isEmpty(filterNodes)) {
        const filterName = `_efe${idx}_`;
        filters[filterName] = filter.filter;
        _.each(filterNodes, node => node.args.push(filterName));
      }
    });

    return new EagerFetcher({
      modelClass: builder._modelClass,
      models: builder._modelClass.ensureModelArray($models),
      eager: expression,
      filters: filters,
      rootQuery: builder
    }).fetch().then(function (models) {
      return _.isArray($models) ? models : models[0];
    });
  } else {
    return $models;
  }
}

function build(builder) {
  let context = builder.context() || {};
  let internalContext = builder.internalContext();

  if (!builder.has(/from|table|into/)) {
    // Set the table only if it hasn't been explicitly set yet.
    builder.table(builder._modelClass.tableName);
  }

  callBuilderFuncs(builder, context.onBuild);
  callBuilderFuncs(builder, internalContext.onBuild);
  callBuilderFuncs(builder, builder._hooks.onBuild);

  // noinspection JSUnresolvedVariable
  return QueryBuilderBase.prototype.build.call(builder);
}

function batchInsert(models, queryBuilder, batchSize) {
  let batches = _.chunk(models, batchSize);
  return _.map(batches, batch => queryBuilder.clone().insert(batch));
}

function callBuilderFuncs(builder, func) {
  if (_.isFunction(func)) {
    func.call(builder, builder);
  } else if (_.isArray(func)) {
    _.each(func, func => {
      func.call(builder, builder);
    });
  }
}

function chainBuilderFuncs(promise, builder, func) {
  if (_.isFunction(func)) {
    promise = promise.then(result => func.call(builder, result, builder));
  } else if (_.isArray(func)) {
    _.each(func, func => {
      promise = promise.then(result => func.call(builder, result, builder));
    });
  }

  return promise;
}