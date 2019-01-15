'use strict';

const jsonApi = require('./postgresJsonApi');
const { ObjectionToKnexConvertingOperation } = require('../ObjectionToKnexConvertingOperation');

class WhereJsonPostgresOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    const args = this.getKnexArgs(builder);

    const rawArgs = jsonApi.whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(
      args[0],
      this.opt.operator,
      args[1],
      this.opt.prefix
    );

    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw.apply(knexBuilder, rawArgs);
    } else {
      knexBuilder.whereRaw.apply(knexBuilder, rawArgs);
    }
  }
}

module.exports = {
  WhereJsonPostgresOperation
};
