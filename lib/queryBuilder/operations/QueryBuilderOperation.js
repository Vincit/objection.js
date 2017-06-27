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

  onBefore1(builder, result) {}
  hasOnBefore1() {
    return this.onBefore1 !== QueryBuilderOperation.prototype.onBefore1;
  }

  onBefore2(builder, result) {}
  hasOnBefore2() {
    return this.onBefore2 !== QueryBuilderOperation.prototype.onBefore2;
  }

  onBefore3(builder, result) {}
  hasOnBefore3() {
    return this.onBefore3 !== QueryBuilderOperation.prototype.onBefore3;
  }

  onBuild(builder) {}
  hasOnBuild() {
    return this.onBuild !== QueryBuilderOperation.prototype.onBuild;
  }

  onBuildKnex(knexBuilder, builder) {}
  hasOnBuildKnex() {
    return this.onBuildKnex !== QueryBuilderOperation.prototype.onBuildKnex;
  }

  onRawResult(builder, rows) { return rows; }
  hasOnRawResult() {
    return this.onRawResult !== QueryBuilderOperation.prototype.onRawResult;
  }

  onAfter1(builder, result) { return result; }
  hasOnAfter1() {
    return this.onAfter1 !== QueryBuilderOperation.prototype.onAfter1;
  }

  onAfter2(builder, result) { return result; }
  hasOnAfter2() {
    return this.onAfter2 !== QueryBuilderOperation.prototype.onAfter2;
  }

  onAfter3(builder, result) { return result; }
  hasOnAfter3() {
    return this.onAfter3 !== QueryBuilderOperation.prototype.onAfter3
  }

  queryExecutor(builder) {}
  hasQueryExecutor() {
    return this.queryExecutor !== QueryBuilderOperation.prototype.queryExecutor;
  }
}

module.exports = QueryBuilderOperation;