export default class QueryBuilderContextBase {

  constructor(userContext) {
    this.userContext = userContext;
    this.skipUndefined = false;
    this.options = {};
    this.debug = false;
    this.knex = null;
  }

  clone() {
    const ctx = new this.constructor();

    ctx.userContext = this.userContext;
    ctx.skipUndefined = this.skipUndefined;
    ctx.options = Object.assign({}, this.options);
    ctx.debug = this.debug;
    ctx.knex = this.knex;

    return ctx;
  }
}