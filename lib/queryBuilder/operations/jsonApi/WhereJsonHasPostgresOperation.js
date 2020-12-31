'use strict';

const jsonApi = require('./postgresJsonApi');
const { ObjectionToKnexConvertingOperation } = require('../ObjectionToKnexConvertingOperation');

class WhereJsonHasPostgresOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    const args = this.getKnexArgs(builder);

    const sql = jsonApi.whereJsonFieldRightStringArrayOnLeftQuery(
      builder.knex(),
      args[0],
      this.opt.operator,
      args[1]
    );

    if (this.opt.bool === 'or') {
      knexBuilder = knexBuilder.orWhereRaw(sql);
    } else {
      knexBuilder = knexBuilder.whereRaw(sql);
    }

    return knexBuilder;
  }
}

module.exports = {
  WhereJsonHasPostgresOperation,
};
