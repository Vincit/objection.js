const SYMBOL_BUILDER = Symbol();

class QueryBuilderUserContext {
  constructor(builder) {
    // This should never ever be accessed outside this class. We only
    // store it so that we can access builder.knex() lazily.
    this[SYMBOL_BUILDER] = builder;
  }

  get transaction() {
    return this[SYMBOL_BUILDER].knex();
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
