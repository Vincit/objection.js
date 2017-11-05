'use strict';

class QueryBuilderUserContext {
  constructor(builder) {
    Object.defineProperty(this, 'transaction', {
      enumerable: false,
      get: () => builder.knex()
    });
  }

  newFromObject(builder, obj) {
    const ctx = new this.constructor(builder);
    Object.assign(ctx, obj);
    return ctx;
  }

  newMerge(builder, obj) {
    const ctx = new this.constructor(builder);
    Object.assign(ctx, this, obj);
    return ctx;
  }
}

module.exports = QueryBuilderUserContext;
