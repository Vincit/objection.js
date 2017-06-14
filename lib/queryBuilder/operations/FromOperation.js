'use strict';

const WrappingQueryBuilderOperation = require('./WrappingQueryBuilderOperation');
const ALIAS_REGEX = /\s+as\s+/;

class FromOperation extends WrappingQueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.table = null;
    this.alias = null;
  }

  call(builder, args){
    const ret = super.call(builder, args);

    for (let i = 0, l = this.args.length; i < l ; ++i) {
      const arg = this.args[i];

      if (typeof arg === 'string') {
        if (ALIAS_REGEX.test(arg)) {
          const parts = arg.split(ALIAS_REGEX);

          this.setTableName(builder, parts[0]);
          this.setAlias(builder, parts[1]);
        } else {
          this.setTableName(builder, arg);
        }

        break;
      }
    }

    return ret;
  }

  onBuildKnex(knexBuilder) {
    knexBuilder.from.apply(knexBuilder, this.args);
  }

  setTableName(builder, tableName) {
    const ctx = builder.internalContext();

    ctx.tableMap = ctx.tableMap || Object.create(null);
    ctx.tableMap[builder.modelClass().tableName] = tableName;

    this.table = tableName;
  }

  setAlias(builder, alias) {
    const ctx = builder.internalContext();

    ctx.aliasMap = ctx.aliasMap || Object.create(null);
    ctx.aliasMap[builder.modelClass().tableName] = alias;

    this.alias = alias;
  }
}

module.exports = FromOperation;