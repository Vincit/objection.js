'use strict';

class QueryBuilderContextBase {

  constructor(userContext) {
    this.userContext = userContext;
    this.options = new InternalOptions();
    this.knex = null;
  }

  clone() {
    const ctx = new this.constructor(this.userContext);

    ctx.options = this.options.clone();
    ctx.knex = this.knex;

    return ctx;
  }
}

class InternalOptions {

  constructor() {
    this.skipUndefined = false;
    this.keepImplicitJoinProps = false;
    this.queryProps = null;
    this.debug = false;
  }

  clone() {
    const copy = new InternalOptions();

    copy.skipUndefined = this.skipUndefined;
    copy.keepImplicitJoinProps = this.keepImplicitJoinProps;
    copy.queryProps = this.queryProps;
    copy.debug = this.debug;

    return copy;
  }
}

module.exports = QueryBuilderContextBase;