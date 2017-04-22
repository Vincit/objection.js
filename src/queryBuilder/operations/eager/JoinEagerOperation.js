const EagerOperation = require('./EagerOperation');
const RelationJoinBuilder = require('./RelationJoinBuilder');

module.exports = class JoinEagerOperation extends EagerOperation {

  constructor(name, opt) {
    super(name, opt);
    this.joinBuilder = null;
  }

  clone(...args) {
    const copy = super.clone(...args);

    if (this.joinBuilder) {
      copy.joinBuilder = this.joinBuilder.clone({
        opt: copy.opt,
        expression: copy.expression
      });
    }

    return copy;
  }

  call(builder, args) {
    const ret = super.call(builder, args);
    const modelClass = builder.modelClass();

    if (ret) {
      this.joinBuilder = new RelationJoinBuilder({
        modelClass: modelClass,
        expression: this.expression,
        opt: this.opt
      })
    }

    return ret;
  }

  onBeforeInternal(builder) {
    return this.joinBuilder.fetchColumnInfo(builder.knex());
  }

  onBeforeBuild(builder) {
    this.joinBuilder.build(builder);
  }

  onRawResult(builder, rows) {
    return this.joinBuilder.rowsToTree(rows);
  }
}