const QueryBuilderOperation = require('./QueryBuilderOperation');

// Operation that simply delegates all calls to the operation passed
// to to the constructor in `opt.delegate`.
class DelegateOperation extends QueryBuilderOperation {
  constructor(name, opt) {
    super(name, opt);

    this.delegate = opt.delegate;
  }

  is(OperationClass) {
    return super.is(OperationClass) || this.delegate.is(OperationClass);
  }

  onAdd(builder, args) {
    return this.delegate.onAdd(builder, args);
  }

  onBefore1(builder, result) {
    return this.delegate.onBefore1(builder, result);
  }

  hasOnBefore1() {
    return this.onBefore1 !== DelegateOperation.prototype.onBefore1 || this.delegate.hasOnBefore1();
  }

  onBefore2(builder, result) {
    return this.delegate.onBefore2(builder, result);
  }

  hasOnBefore2() {
    return this.onBefore2 !== DelegateOperation.prototype.onBefore2 || this.delegate.hasOnBefore2();
  }

  onBefore3(builder, result) {
    return this.delegate.onBefore3(builder, result);
  }

  hasOnBefore3() {
    return this.onBefore3 !== DelegateOperation.prototype.onBefore3 || this.delegate.hasOnBefore3();
  }

  onBuild(builder) {
    return this.delegate.onBuild(builder);
  }

  hasOnBuild() {
    return this.onBuild !== DelegateOperation.prototype.onBuild || this.delegate.hasOnBuild();
  }

  onBuildKnex(knexBuilder, builder) {
    return this.delegate.onBuildKnex(knexBuilder, builder);
  }

  hasOnBuildKnex() {
    return (
      this.onBuildKnex !== DelegateOperation.prototype.onBuildKnex || this.delegate.hasOnBuildKnex()
    );
  }

  onRawResult(builder, result) {
    return this.delegate.onRawResult(builder, result);
  }

  hasOnRawResult() {
    return (
      this.onRawResult !== DelegateOperation.prototype.onRawResult || this.delegate.hasOnRawResult()
    );
  }

  onAfter1(builder, result) {
    return this.delegate.onAfter1(builder, result);
  }

  hasOnAfter1() {
    return this.onAfter1 !== DelegateOperation.prototype.onAfter1 || this.delegate.hasOnAfter1();
  }

  onAfter2(builder, result) {
    return this.delegate.onAfter2(builder, result);
  }

  hasOnAfter2() {
    return this.onAfter2 !== DelegateOperation.prototype.onAfter2 || this.delegate.hasOnAfter2();
  }

  onAfter3(builder, result) {
    return this.delegate.onAfter3(builder, result);
  }

  hasOnAfter3() {
    return this.onAfter3 !== DelegateOperation.prototype.onAfter3 || this.delegate.hasOnAfter3();
  }

  queryExecutor(builder) {
    return this.delegate.queryExecutor(builder);
  }

  hasQueryExecutor() {
    return (
      this.queryExecutor !== DelegateOperation.prototype.queryExecutor ||
      this.delegate.hasQueryExecutor()
    );
  }

  onError(builder, error) {
    return this.delegate.onError(builder, error);
  }

  hasOnError() {
    return this.onError !== DelegateOperation.prototype.onError || this.delegate.hasOnError();
  }
}

module.exports = DelegateOperation;
