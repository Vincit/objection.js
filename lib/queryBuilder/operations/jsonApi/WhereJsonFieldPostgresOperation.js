'use strict';

const jsonApi = require('./postgresJsonApi');
const WrappingQueryBuilderOperation = require('../WrappingQueryBuilderOperation');

class WhereJsonFieldPostgresOperation extends WrappingQueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.sql = null;
  }

  call(builder, args) {
    super.call(builder, args);

    this.sql = jsonApi.whereJsonFieldQuery(builder.knex(), this.args[0], this.args[1], this.args[2]);

    return true;
  }

  onBuildKnex(knexBuilder) {
    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw(this.sql);
    } else {
      knexBuilder.whereRaw(this.sql);
    }
  }
}

module.exports = WhereJsonFieldPostgresOperation;
