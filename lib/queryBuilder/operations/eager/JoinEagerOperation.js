const EagerOperation = require('./EagerOperation');
const RelationJoinBuilder = require('./RelationJoinBuilder');

class JoinEagerOperation extends EagerOperation {
  constructor(name, opt) {
    super(name, opt);
    this.joinBuilder = null;
  }

  onAdd(builder, args) {
    const ret = super.onAdd(builder, args);
    const modelClass = builder.modelClass();

    if (ret) {
      this.joinBuilder = new RelationJoinBuilder({
        modelClass: modelClass,
        expression: this.expression,
        modifiers: this.modifiers
      });
    }

    return ret;
  }

  onBefore2(builder) {
    // Only now set the options since they may have changed up until now.
    this.joinBuilder.setOptions(builder.eagerOptions());

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
