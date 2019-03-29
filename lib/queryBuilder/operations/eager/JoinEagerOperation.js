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
      modelClass: builder.modelClass()
    });

    return true;
  }

  onBefore3(builder) {
    return this.joiner
      .setExpression(this.finalExpression)
      .setModifiers(this.finalModifiers)
      .setOptions(this.eagerOptions)
      .fetchColumnInfo(builder);
  }

  onBuild(builder) {
    this.joiner
      .setExpression(this.finalExpression)
      .setModifiers(this.finalModifiers)
      .setOptions(this.eagerOptions)
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
  JoinEagerOperation
};
