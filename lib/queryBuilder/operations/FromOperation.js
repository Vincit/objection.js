'use strict';

const { ObjectionToKnexConvertingOperation } = require('./ObjectionToKnexConvertingOperation');
const { isPlainObject, isString } = require('../../utils/objectUtils');

const ALIAS_REGEX = /\s+as\s+/i;

// FromOperation corresponds to a `.from(args)` call. The call is delegated to
// knex, but we first try to parse the arguments so that we can determine which
// tables have been mentioned in a query's from clause. We only parse string
// references and not `raw` or `ref` etc. references at this point thouhg.
class FromOperation extends ObjectionToKnexConvertingOperation {
  constructor(name, opt) {
    super(name, opt);

    this.table = null;
    this.alias = null;
  }

  onAdd(builder, args) {
    const ret = super.onAdd(builder, args);
    const parsed = parseTableAndAlias(this.args[0], builder);

    if (parsed.table) {
      builder.tableName(parsed.table);
      this.table = parsed.table;
    }

    if (parsed.alias) {
      builder.aliasFor(builder.modelClass().getTableName(), parsed.alias);
      this.alias = parsed.alias;
    }

    return ret;
  }

  onBuildKnex(knexBuilder, builder) {
    // Simply call knex's from method with the converted arguments.
    return knexBuilder.from.apply(knexBuilder, this.getKnexArgs(builder));
  }

  clone() {
    const clone = super.clone();

    clone.table = this.table;
    clone.alias = this.alias;

    return clone;
  }
}

function parseTableAndAlias(arg, builder) {
  if (isString(arg)) {
    return parseTableAndAliasFromString(arg);
  } else if (isPlainObject(arg)) {
    return parseTableAndAliasFromObject(arg, builder);
  } else {
    // Could not parse table and alias from the arguments.
    return {
      table: null,
      alias: null,
    };
  }
}

function parseTableAndAliasFromString(arg) {
  if (ALIAS_REGEX.test(arg)) {
    const parts = arg.split(ALIAS_REGEX);

    return {
      table: parts[0].trim(),
      alias: parts[1].trim(),
    };
  } else {
    return {
      table: arg.trim(),
      alias: null,
    };
  }
}

function parseTableAndAliasFromObject(arg, builder) {
  for (const alias of Object.keys(arg)) {
    const table = arg[alias].trim();

    if (table === builder.modelClass().getTableName()) {
      return {
        alias,
        table,
      };
    }
  }

  throw new Error(
    `one of the tables in ${JSON.stringify(arg)} must be the query's model class's table.`
  );
}

module.exports = {
  FromOperation,
};
