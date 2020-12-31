'use strict';

const jsonApi = require('./postgresJsonApi');
const { ObjectionToKnexConvertingOperation } = require('../ObjectionToKnexConvertingOperation');

class WhereJsonNotObjectPostgresOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    return this.whereJsonNotObject(knexBuilder, builder.knex(), this.getKnexArgs(builder)[0]);
  }

  whereJsonNotObject(knexBuilder, knex, fieldExpression) {
    const innerQuery = (innerQuery) => {
      const builder = jsonApi.whereJsonbRefOnLeftJsonbValOrRefOnRight(
        innerQuery,
        fieldExpression,
        '@>',
        this.opt.compareValue,
        'not'
      );

      builder.orWhereRaw(jsonApi.whereJsonFieldQuery(knex, fieldExpression, 'IS', null));
    };

    if (this.opt.bool === 'or') {
      knexBuilder = knexBuilder.orWhere(innerQuery);
    } else {
      knexBuilder = knexBuilder.where(innerQuery);
    }

    return knexBuilder;
  }
}

module.exports = {
  WhereJsonNotObjectPostgresOperation,
};
