const DelegateOperation = require('./DelegateOperation');
const InsertGraphOperation = require('./InsertGraphOperation');
const { RelationExpression } = require('../RelationExpression');

class InsertGraphAndFetchOperation extends DelegateOperation {
  constructor(name, opt) {
    super(name, opt);

    if (!this.delegate.is(InsertGraphOperation)) {
      throw new Error('Invalid delegate');
    }
  }

  get models() {
    return this.delegate.models;
  }

  get isArray() {
    return this.delegate.isArray;
  }

  onAfter2(builder) {
    const eager = RelationExpression.fromModelGraph(this.models);
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

module.exports = InsertGraphAndFetchOperation;
