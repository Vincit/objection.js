'use strict';

const { EagerOperation } = require('./EagerOperation');
const { RelationJoiner } = require('../../join/RelationJoiner');

class JoinEagerOperation extends EagerOperation {
  constructor(name, opt) {
    super(name, opt);
    this.joiner = null;
  }

  onAdd(builder) {
    builder.findOptions({ callAfterFindDeeply: true });

    this.joiner = new RelationJoiner({
      modelClass: builder.modelClass(),
    });

    return true;
  }

  onBefore3(builder) {
    return this.joiner
      .setExpression(this.buildFinalExpression())
      .setModifiers(this.buildFinalModifiers(builder))
      .setOptions(this.graphOptions)
      .fetchColumnInfo(builder);
  }

  onBuild(builder) {
    this.joiner
      .setExpression(this.buildFinalExpression())
      .setModifiers(this.buildFinalModifiers(builder))
      .setOptions(this.graphOptions)
      .build(builder);
  }

  onRawResult(builder, rows) {
    return this.joiner.parseResult(builder, rows);
  }

  clone() {
    const clone = super.clone();
    clone.joiner = this.joiner;
    return clone;
  }
}

module.exports = {
  JoinEagerOperation,
};
