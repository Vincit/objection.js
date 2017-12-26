const jsonApi = require('./postgresJsonApi');
const ObjectionToKnexConvertingOperation = require('../ObjectionToKnexConvertingOperation');

class WhereJsonNotObjectPostgresOperation extends ObjectionToKnexConvertingOperation {
  onBuildKnex(knexBuilder, builder) {
    this.whereJsonNotObject(knexBuilder, builder.knex(), this.args[0]);
  }

  whereJsonNotObject(knexBuilder, knex, fieldExpression) {
    const innerQuery = innerQuery => {
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
      knexBuilder.orWhere(innerQuery);
    } else {
      knexBuilder.where(innerQuery);
    }
  }
}

module.exports = WhereJsonNotObjectPostgresOperation;
