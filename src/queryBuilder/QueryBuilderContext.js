const QueryBuilderContextBase = require('./QueryBuilderContextBase');

module.exports = class QueryBuilderContext extends QueryBuilderContextBase {

  constructor(userContext) {
    super(userContext);

    this.runBefore = [];
    this.runAfter = [];
    this.onBuild = [];
  }

  clone() {
    let ctx = super.clone();

    ctx.runBefore = this.runBefore.slice();
    ctx.runAfter = this.runAfter.slice();
    ctx.onBuild = this.onBuild.slice();

    return ctx;
  }
}