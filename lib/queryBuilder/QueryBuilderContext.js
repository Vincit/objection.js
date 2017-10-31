'use strict';

const QueryBuilderContextBase = require('./QueryBuilderContextBase');

class QueryBuilderContext extends QueryBuilderContextBase {
  constructor(userContext) {
    super(userContext);

    this.runBefore = [];
    this.runAfter = [];
    this.onBuild = [];

    this.aliasMap = null;
    this.tableMap = null;
  }

  clone() {
    const ctx = super.clone();

    ctx.runBefore = this.runBefore.slice();
    ctx.runAfter = this.runAfter.slice();
    ctx.onBuild = this.onBuild.slice();

    ctx.aliasMap = this.aliasMap;
    ctx.tableMap = this.tableMap;

    return ctx;
  }
}

module.exports = QueryBuilderContext;
