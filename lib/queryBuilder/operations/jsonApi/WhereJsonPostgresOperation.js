'use strict';

const jsonApi = require('./postgresJsonApi');
const WrappingQueryBuilderOperation = require('../WrappingQueryBuilderOperation');

class WhereJsonPostgresOperation extends WrappingQueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.rawArgs = null;
  }

  call(builder, args) {
    super.call(builder, args);

    this.rawArgs = jsonApi.whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(
      this.args[0],
      this.opt.operator,
      this.args[1],
      this.opt.prefix);

    return true;
  }

  onBuildKnex(knexBuilder) {
    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw.apply(knexBuilder, this.rawArgs);
    } else {
      knexBuilder.whereRaw.apply(knexBuilder, this.rawArgs);
    }
  }
}

module.exports = WhereJsonPostgresOperation;
