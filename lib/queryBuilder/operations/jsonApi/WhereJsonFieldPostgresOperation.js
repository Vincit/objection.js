'use strict';

const jsonApi = require('./postgresJsonApi');
const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');

class WhereJsonFieldPostgresOperation extends ObjectionToKnexConvertingOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.sql = null;
  }

  onAdd(builder, args) {
    super.onAdd(builder, args);

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
