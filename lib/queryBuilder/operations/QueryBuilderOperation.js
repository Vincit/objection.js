// An abstract base class for all query builder operations. QueryBuilderOperations almost always
// correspond to a single query builder method call. For example SelectOperation could be added when
// a `select` method is called.
//
// QueryBuilderOperation is just a bunch of query execution lifecycle hooks that subclasses
// can (but don't have to) implement.
//
// Basically a query builder is nothing but an array of QueryBuilderOperations. When the query is
// executed the hooks are called in the order explained below. The hooks are called so that a
// certain hook is called for _all_ operations before the next hook is called. For example if
// a builder has 5 operations, onBefore1 hook is called for each of them (and their results are awaited)
// before onBefore2 hook is called for any of the operations.
class QueryBuilderOperation {
  constructor(name, opt) {
    this.name = name;
    this.opt = opt || {};
  }

  is(OperationClass) {
    return this instanceof OperationClass;
  }

  // This is called immediately when a query builder method is called.
  //
  // This method must be synchronous.
  // This method should never call any methods that add operations to the builder.
  onAdd(builder, args) {
    return true;
  }

  // This is called as the first thing when the query is executed but before
  // the actual database operation (knex query) is executed.
  //
  // This method can be asynchronous.
  // You may call methods that add operations to to the builder.
  onBefore1(builder, result) {}
  hasOnBefore1() {
    return this.onBefore1 !== QueryBuilderOperation.prototype.onBefore1;
  }

  // This is called as the second thing when the query is executed but before
  // the actual database operation (knex query) is executed.
  //
  // This method can be asynchronous.
  // You may call methods that add operations to to the builder.
  onBefore2(builder, result) {}
  hasOnBefore2() {
    return this.onBefore2 !== QueryBuilderOperation.prototype.onBefore2;
  }

  // This is called as the third thing when the query is executed but before
  // the actual database operation (knex query) is executed.
  //
  // This method can be asynchronous.
  // You may call methods that add operations to to the builder.
  onBefore3(builder, result) {}
  hasOnBefore3() {
    return this.onBefore3 !== QueryBuilderOperation.prototype.onBefore3;
  }

  // This is called as the last thing when the query is executed but before
  // the actual database operation (knex query) is executed. If your operation
  // needs to call other query building operations (methods that add QueryBuilderOperations)
  // this is the best and last place to do it.
  //
  // This method must be synchronous.
  // You may call methods that add operations to to the builder.
  onBuild(builder) {}
  hasOnBuild() {
    return this.onBuild !== QueryBuilderOperation.prototype.onBuild;
  }

  // This is called when the knex query is built. Here you should only call knex
  // methods. You may call getters and other immutable methods of the `builder`
  // but you should never call methods that add QueryBuilderOperations.
  //
  // This method must be synchronous.
  // This method should never call any methods that add operations to the builder.
  onBuildKnex(knexBuilder, builder) {}
  hasOnBuildKnex() {
    return this.onBuildKnex !== QueryBuilderOperation.prototype.onBuildKnex;
  }

  // The raw knex result is passed to this method right after the database query
  // has finished. This method may modify it and return the modified rows. The
  // rows are automatically converted to models (if possible) after this hook
  // is called.
  //
  // This method can be asynchronous.
  onRawResult(builder, rows) {
    return rows;
  }
  hasOnRawResult() {
    return this.onRawResult !== QueryBuilderOperation.prototype.onRawResult;
  }

  // This is called as the first thing after the query has been executed and
  // rows have been converted to model instances.
  //
  // This method can be asynchronous.
  onAfter1(builder, result) {
    return result;
  }
  hasOnAfter1() {
    return this.onAfter1 !== QueryBuilderOperation.prototype.onAfter1;
  }

  // This is called as the second thing after the query has been executed and
  // rows have been converted to model instances.
  //
  // This method can be asynchronous.
  onAfter2(builder, result) {
    return result;
  }
  hasOnAfter2() {
    return this.onAfter2 !== QueryBuilderOperation.prototype.onAfter2;
  }

  // This is called as the third thing after the query has been executed and
  // rows have been converted to model instances.
  //
  // This method can be asynchronous.
  onAfter3(builder, result) {
    return result;
  }
  hasOnAfter3() {
    return this.onAfter3 !== QueryBuilderOperation.prototype.onAfter3;
  }

  // This method can be implemented to return another operation that will replace
  // this one. This method is called after all `onBeforeX` and `onBuildX` hooks
  // but before the database query is executed.
  //
  // This method must return a QueryBuilder instance.
  queryExecutor(builder) {}
  hasQueryExecutor() {
    return this.queryExecutor !== QueryBuilderOperation.prototype.queryExecutor;
  }

  // This is called if an error occurs in the query execution.
  //
  // This method must return a QueryBuilder instance.
  onError(builder, error) {}
  hasOnError() {
    return this.onError !== QueryBuilderOperation.prototype.onError;
  }
}

module.exports = QueryBuilderOperation;
