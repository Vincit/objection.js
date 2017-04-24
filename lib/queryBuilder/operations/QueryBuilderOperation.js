'use strict';

class QueryBuilderOperation {

  constructor(name, opt) {
    this.name = name;
    this.opt = opt || {};
    this.isWriteOperation = false;
  }

  is(OperationClass) {
    return this instanceof OperationClass;
  }

  call(builder, args) {
    return true;
  }

  onBefore(builder, result) {}
  hasOnBefore() {
    return this.onBefore !== QueryBuilderOperation.prototype.onBefore;
  }

  onBeforeInternal(builder, result) {}
  hasOnBeforeInternal() {
    return this.onBeforeInternal !== QueryBuilderOperation.prototype.onBeforeInternal;
  }

  onBeforeBuild(builder) {}
  hasOnBeforeBuild() {
    return this.onBeforeBuild !== QueryBuilderOperation.prototype.onBeforeBuild;
  }

  onBuild(knexBuilder, builder) {}
  hasOnBuild() {
    return this.onBuild !== QueryBuilderOperation.prototype.onBuild;
  }

  onRawResult(builder, rows) { return rows; }
  hasOnRawResult() {
    return this.onRawResult !== QueryBuilderOperation.prototype.onRawResult;
  }

  onAfterQuery(builder, result) {}
  hasOnAfterQuery() {
    return this.onAfterQuery !== QueryBuilderOperation.prototype.onAfterQuery;
  }

  onAfterInternal(builder, result) {}
  hasOnAfterInternal() {
    return this.onAfterInternal !== QueryBuilderOperation.prototype.onAfterInternal;
  }

  onAfter(builder, result) {}
  hasOnAfter() {
    return this.onAfter !== QueryBuilderOperation.prototype.onAfter;
  }

  queryExecutor(builder) {}
  hasQueryExecutor() {
    return this.queryExecutor !== QueryBuilderOperation.prototype.queryExecutor;
  }
}

module.exports = QueryBuilderOperation;