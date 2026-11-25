'use strict';

const jsonApi = require('./postgresJsonApi');
const { ObjectionToKnexConvertingOperation } = require('../ObjectionToKnexConvertingOperation');

class WhereJsonHasPostgresOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    const args = this.getKnexArgs(builder);

    const rawArgs = jsonApi.whereJsonFieldRightStringArrayOnLeftQuery(
      args[0],
      this.opt.operator,
      args[1],
    );

    if (this.opt.bool === 'or') {
      knexBuilder = knexBuilder.orWhereRaw(...rawArgs);
    } else {
      knexBuilder = knexBuilder.whereRaw(...rawArgs);
    }

    return knexBuilder;
  }
}

module.exports = {
  WhereJsonHasPostgresOperation,
};
