import QueryBuilderMethod from './QueryBuilderMethod';

export default class DelegateMethod extends QueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.delegate = opt.delegate;
    this.isWriteMethod = this.delegate.isWriteMethod;
  }

  formatter() {
    return this.delegate.formatter();
  }

  raw() {
    return this.delegate.raw.apply(this.delegate, arguments);
  }

  call(builder, args) {
    return this.delegate.call(builder, args);
  }

  onBefore(builder, result) {
    return this.delegate.onBefore(builder, result);
  }

  hasOnBefore() {
    return this.onBefore !== DelegateMethod.prototype.onBefore || this.delegate.hasOnBefore();
  }

  onBeforeBack(builder, result) {
    return this.delegate.onBeforeBack(builder, result);
  }

  hasOnBefore() {
    return this.onBeforeBack !== DelegateMethod.prototype.onBeforeBack || this.delegate.hasOnBeforeBack();
  }

  onAfterModelCreateFront(builder, result) {
    return this.delegate.onAfterModelCreateFront(builder, result);
  }

  hasOnAfterModelCreateFront() {
    return this.onAfterModelCreateFront !== DelegateMethod.prototype.onAfterModelCreateFront || this.delegate.hasOnAfterModelCreateFront();
  }

  onAfterModelCreate(builder, result) {
    return this.delegate.onAfterModelCreate(builder, result);
  }

  hasOnAfterModelCreate() {
    return this.onAfterModelCreate !== DelegateMethod.prototype.onAfterModelCreate || this.delegate.hasOnAfterModelCreate();
  }

  onAfter(builder, result) {
    return this.delegate.onAfter(builder, result);
  }

  hasOnAfter() {
    return this.onAfter !== DelegateMethod.prototype.onAfter || this.delegate.hasOnAfter();
  }

  queryExecutor(builder) {
    return this.delegate.queryExecutor(builder);
  }

  hasQueryExecutor() {
    return this.queryExecutor !== DelegateMethod.prototype.queryExecutor || this.delegate.hasQueryExecutor();
  }

  onBeforeBuild(builder) {
    return this.delegate.onBeforeBuild(builder);
  }

  hasOnBeforeBuild() {
    return this.onBeforeBuild !== DelegateMethod.prototype.onBeforeBuild || this.delegate.hasOnBeforeBuild();
  }

  onBuild(knexBuilder, builder) {
    return this.delegate.onBuild(knexBuilder, builder);
  }

  hasOnBuild() {
    return this.onBuild !== DelegateMethod.prototype.onBuild || this.delegate.hasOnBuild();
  }
}