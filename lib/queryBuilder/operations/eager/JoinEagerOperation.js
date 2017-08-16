'use strict';

const EagerOperation = require('./EagerOperation');
const RelationJoinBuilder = require('./RelationJoinBuilder');

class JoinEagerOperation extends EagerOperation {

  constructor(name, opt) {
    super(name, opt);
    this.joinBuilder = null;
  }

  clone(props) {
    const copy = super.clone(props);

    if (this.joinBuilder) {
      copy.joinBuilder = this.joinBuilder.clone({
        opt: copy.opt,
        expression: copy.expression
      });
    }

    return copy;
  }

  onAdd(builder, args) {
    const ret = super.onAdd(builder, args);
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

  onBefore2(builder) {
    return this.joinBuilder.fetchColumnInfo(builder);
  }

  onBuild(builder) {
    builder.findOptions({
      callAfterGetDeeply: true
    });
    
    this.joinBuilder.build(builder);
  }

  onRawResult(builder, rows) {
    return this.joinBuilder.rowsToTree(rows);
  }
}

module.exports = JoinEagerOperation;