'use strict';

const { DelegateOperation } = require('./DelegateOperation');
const { UpsertGraphOperation } = require('./UpsertGraphOperation');
const { RelationExpression } = require('../RelationExpression');

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
    if (this.models.length === 0) {
      return this.isArray ? [] : null;
    }

    const eager = RelationExpression.fromModelGraph(this.models);
    const modelClass = this.models[0].constructor;
    const ids = this.models.map(model => model.$id());

    return modelClass
      .query()
      .childQueryOf(builder)
      .findByIds(ids)
      .eager(eager)
      .then(models => {
        return this.isArray ? models : models[0] || null;
      });
  }
}

module.exports = {
  UpsertGraphAndFetchOperation
};
