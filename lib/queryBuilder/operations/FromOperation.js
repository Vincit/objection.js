'use strict';

const ObjectionToKnexConvertingOperation = require('./ObjectionToKnexConvertingOperation');

const ALIAS_REGEX = /\s+as\s+/;

class FromOperation extends ObjectionToKnexConvertingOperation {

  constructor(name, opt) {
    super(name, opt);

    this.table = null;
    this.alias = null;
  }

  onAdd(builder, args){
    const ret = super.onAdd(builder, args);

    for (let i = 0, l = this.args.length; i < l ; ++i) {
      const arg = this.args[i];

      if (typeof arg === 'string') {
        if (ALIAS_REGEX.test(arg)) {
          const parts = arg.split(ALIAS_REGEX);

          this.setTableName(builder, parts[0].trim());
          this.setAlias(builder, parts[1].trim());
        } else {
          this.setTableName(builder, arg.trim());
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
    builder.tableNameFor(builder.modelClass(), tableName);
    this.table = tableName;
  }

  setAlias(builder, alias) {
    builder.aliasFor(builder.modelClass(), alias);
    this.alias = alias;
  }
}

module.exports = FromOperation;