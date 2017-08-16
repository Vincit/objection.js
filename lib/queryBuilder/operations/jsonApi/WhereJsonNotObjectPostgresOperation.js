'use strict';

const jsonApi = require('./postgresJsonApi');
const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');

class WhereJsonNotObjectPostgresOperation extends ObjectionToKnexConvertingOperation {

  onBuildKnex(knexBuilder, builder) {
    this.whereJsonNotObject(knexBuilder, builder.knex(), this.args[0]);
  }

  whereJsonNotObject(knexBuilder, knex, fieldExpression) {
    const self = this;

    function innerQuery() {
      let builder = jsonApi.whereJsonbRefOnLeftJsonbValOrRefOnRight(this, fieldExpression, "@>", self.opt.compareValue, 'not');
      let ifRefNotExistQuery = jsonApi.whereJsonFieldQuery(knex, fieldExpression, "IS", null);
      builder.orWhereRaw(ifRefNotExistQuery);
    }

    if (this.opt.bool === 'or') {
      knexBuilder.orWhere(innerQuery);
    } else {
      knexBuilder.where(innerQuery);
    }
  }
}

module.exports = WhereJsonNotObjectPostgresOperation;
