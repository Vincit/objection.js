const DelegateOperation = require('./DelegateOperation');
const RelationExpression = require('../RelationExpression');
const UpsertGraphOperation = require('./UpsertGraphOperation');

class UpsertGraphAndFetchOperation extends DelegateOperation {
  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(UpsertGraphOperation)) {
      throw new Error('Invalid delegate');
    }
  }

  get models() {
    return this.delegate.models;
  }

  get isArray() {
    return this.delegate.isArray;
  }

  onAfter3(builder) {
    const eager = RelationExpression.fromGraph(this.models);
    const modelClass = this.models[0].constructor;
    const ids = new Array(this.models.length);

    for (let i = 0, l = this.models.length; i < l; ++i) {
      ids[i] = this.models[i].$id();
    }

    return modelClass
      .query()
      .childQueryOf(builder)
      .whereIn(builder.fullIdColumnFor(modelClass), ids)
      .eager(eager)
      .then(models => {
        return this.isArray ? models : models[0] || null;
      });
  }
}

module.exports = UpsertGraphAndFetchOperation;
