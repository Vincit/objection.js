export default class QueryBuilderContextBase {

  constructor() {
    this.userContext = {};
  }

  clone() {
    const ctx = new this.constructor();

    ctx.userContext = this.userContext;

    return ctx;
  }
}