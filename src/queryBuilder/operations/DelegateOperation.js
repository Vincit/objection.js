import QueryBuilderOperation from './QueryBuilderOperation';

export default class DelegateOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.delegate = opt.delegate;
    this.isWriteOperation = this.delegate.isWriteOperation;
  }

  call(builder, args) {
    return this.delegate.call(builder, args);
  }

  onBefore(builder, result) {
    return this.delegate.onBefore(builder, result);
  }

  hasOnBefore() {
    return this.onBefore !== DelegateOperation.prototype.onBefore || this.delegate.hasOnBefore();
  }

  onBeforeInternal(builder, result) {
    return this.delegate.onBeforeInternal(builder, result);
  }

  hasOnBeforeInternal() {
    return this.onBeforeInternal !== DelegateOperation.prototype.onBeforeInternal || this.delegate.hasOnBeforeInternal();
  }

  onBeforeBuild(builder) {
    return this.delegate.onBeforeBuild(builder);
  }

  hasOnBeforeBuild() {
    return this.onBeforeBuild !== DelegateOperation.prototype.onBeforeBuild || this.delegate.hasOnBeforeBuild();
  }

  onBuild(knexBuilder, builder) {
    return this.delegate.onBuild(knexBuilder, builder);
  }

  hasOnBuild() {
    return this.onBuild !== DelegateOperation.prototype.onBuild || this.delegate.hasOnBuild();
  }

  onRawResult(builder, result) {
    return this.delegate.onRawResult(builder, result);
  }

  hasOnRawResult() {
    return this.onRawResult !== DelegateOperation.prototype.onRawResult || this.delegate.hasOnRawResult();
  }

  onAfterQuery(builder, result) {
    return this.delegate.onAfterQuery(builder, result);
  }

  hasOnAfterQuery() {
    return this.onAfterQuery !== DelegateOperation.prototype.onAfterQuery || this.delegate.hasOnAfterQuery();
  }

  onAfterInternal(builder, result) {
    return this.delegate.onAfterInternal(builder, result);
  }

  hasOnAfterInternal() {
    return this.onAfterInternal !== DelegateOperation.prototype.onAfterInternal || this.delegate.hasOnAfterInternal();
  }

  onAfter(builder, result) {
    return this.delegate.onAfter(builder, result);
  }

  hasOnAfter() {
    return this.onAfter !== DelegateOperation.prototype.onAfter || this.delegate.hasOnAfter();
  }

  queryExecutor(builder) {
    return this.delegate.queryExecutor(builder);
  }

  hasQueryExecutor() {
    return this.queryExecutor !== DelegateOperation.prototype.queryExecutor || this.delegate.hasQueryExecutor();
  }
}