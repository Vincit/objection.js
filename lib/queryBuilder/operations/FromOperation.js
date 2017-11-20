'use strict';

const ObjectionToKnexConvertingOperation = require('./ObjectionToKnexConvertingOperation');
const isPlainObject = require('../../utils/objectUtils').isPlainObject;

const ALIAS_REGEX = /\s+as\s+/;

class FromOperation extends ObjectionToKnexConvertingOperation {
  constructor(name, opt) {
    super(name, opt);

    this.table = null;
    this.alias = null;
  }

  onAdd(builder, args) {
    const ret = super.onAdd(builder, args);
    const arg = this.args[0];

    if (typeof arg === 'string') {
      if (ALIAS_REGEX.test(arg)) {
        const parts = arg.split(ALIAS_REGEX);

        this.setTableName(builder, parts[0].trim());
        this.setAlias(builder, parts[1].trim());
      } else {
        this.setTableName(builder, arg.trim());
      }
    } else if (isPlainObject(arg)) {
      const aliases = Object.keys(arg);
      let modelTableFound = false;

      for (let i = 0, l = aliases.length; i < l; ++i) {
        const alias = aliases[i];
        const table = arg[alias];

        if (table === builder.modelClass().getTableName()) {
          this.setAlias(builder, alias);

          modelTableFound = true;
          break;
        }
      }

      if (!modelTableFound) {
        throw new Error(
          `one of the tables in ${JSON.stringify(arg)} must be the query's model class's table.`
        );
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
