'use strict';

const { EagerOperation } = require('./EagerOperation');
const { RelationJoinBuilder } = require('./RelationJoinBuilder');

class JoinEagerOperation extends EagerOperation {
  constructor(name, opt) {
    super(name, opt);
    this._joinBuilder = null;
  }

  getJoinBuilder(builder) {
    // Only create the join builder when we absolutely need to.
    if (!this._joinBuilder) {
      this._joinBuilder = new RelationJoinBuilder({
        modelClass: builder.modelClass(),
        expression: this.finalExpression,
        modifiers: this.finalModifiers
      });
    }

    return this._joinBuilder;
  }

  onBefore3(builder) {
    return this.getJoinBuilder(builder)
      .setOptions(this.eagerOptions)
      .fetchColumnInfo(builder);
  }

  onBuild(builder) {
    builder.findOptions({ callAfterGetDeeply: true });
    this.getJoinBuilder(builder).build(builder);
  }

  onRawResult(builder, rows) {
    return this.getJoinBuilder(builder).rowsToTree(rows);
  }

  clone() {
    const clone = super.clone();
    clone._joinBuilder = this._joinBuilder && this._joinBuilder.clone();
    return clone;
  }
}

module.exports = {
  JoinEagerOperation
};
