const jsonApi = require('./postgresJsonApi');
const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');

class WhereJsonPostgresOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder) {
    const rawArgs = jsonApi.whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(
      this.args[0],
      this.opt.operator,
      this.args[1],
      this.opt.prefix
    );

    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw.apply(knexBuilder, rawArgs);
    } else {
      knexBuilder.whereRaw.apply(knexBuilder, rawArgs);
    }
  }
}

module.exports = WhereJsonPostgresOperation;
