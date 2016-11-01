export default class QueryBuilderContextBase {

  constructor(userContext) {
    this.userContext = userContext;
    this.skipUndefined = false;
    this.knex = null;
  }

  clone() {
    const ctx = new this.constructor();

    ctx.userContext = this.userContext;
    ctx.skipUndefined = this.skipUndefined;
    ctx.knex = this.knex;

    return ctx;
  }
}