'use strict';

const jsonApi = require('./postgresJsonApi');
const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');

class WhereJsonHasPostgresOperation extends ObjectionToKnexConvertingOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.sql = null;
  }

  onAdd(builder, args) {
    super.onAdd(builder, args);

    this.sql = jsonApi.whereJsonFieldRightStringArrayOnLeftQuery(builder, this.args[0], this.opt.operator, this.args[1]);

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

module.exports = WhereJsonHasPostgresOperation;
