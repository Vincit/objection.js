'use strict';

const jsonApi = require('./postgresJsonApi');
const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');

class WhereJsonFieldPostgresOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    const sql = jsonApi.whereJsonFieldQuery(
      builder.knex(),
      this.args[0],
      this.args[1],
      this.args[2]
    );

    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw(sql);
    } else {
      knexBuilder.whereRaw(sql);
    }
  }
}

module.exports = WhereJsonFieldPostgresOperation;
