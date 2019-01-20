'use strict';

const { EagerOperation } = require('./EagerOperation');
const { RelationJoinBuilder } = require('./RelationJoinBuilder');

class JoinEagerOperation extends EagerOperation {
  constructor(name, opt) {
    super(name, opt);
    this.joinBuilder = null;
  }

  getJoinBuilder(builder) {
    // Only create the join builder when we absolutely need to.
    if (!this.joinBuilder) {
      this.joinBuilder = new RelationJoinBuilder({
        modelClass: builder.modelClass(),
        expression: this.expression,
        modifiers: this.modifiers
      });
    }

    return this.joinBuilder;
  }

  onBefore3(builder) {
    return this.getJoinBuilder(builder)
      .setOptions(builder.eagerOptions())
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
    clone.joinBuilder = this.joinBuilder && this.joinBuilder.clone();
    return clone;
  }
}

module.exports = {
  JoinEagerOperation
};
