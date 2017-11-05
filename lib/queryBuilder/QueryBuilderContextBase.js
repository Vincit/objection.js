'use strict';

const InternalOptions = require('./InternalOptions');

class QueryBuilderContextBase {
  constructor(builder) {
    this.userContext = builder ? new builder.constructor.QueryBuilderUserContext(builder) : null;
    this.options = builder ? new this.constructor.InternalOptions() : null;
    this.knex = null;
  }

  static get InternalOptions() {
    return InternalOptions;
  }

  clone() {
    const ctx = new this.constructor();

    ctx.userContext = this.userContext;
    ctx.options = this.options.clone();
    ctx.knex = this.knex;

    return ctx;
  }
}

module.exports = QueryBuilderContextBase;
