const jsonApi = require('./postgresJsonApi');
const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');

class WhereJsonHasPostgresOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    const sql = jsonApi.whereJsonFieldRightStringArrayOnLeftQuery(
      builder.knex(),
      this.args[0],
      this.opt.operator,
      this.args[1]
    );

    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw(sql);
    } else {
      knexBuilder.whereRaw(sql);
    }
  }
}

module.exports = WhereJsonHasPostgresOperation;
