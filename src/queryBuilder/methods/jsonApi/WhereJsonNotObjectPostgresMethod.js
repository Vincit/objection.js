import _ from 'lodash';
import jsonApi from './postgresJsonApi';
import QueryBuilderMethod from '../QueryBuilderMethod';

export default class WhereJsonNotObjectPostgresMethod extends QueryBuilderMethod {

  onBuild(knexBuilder) {
    this.whereJsonNotObject(knexBuilder, this.args[0]);
  }

  whereJsonNotObject(knexBuilder, fieldExpression) {
    const knex = this.knex;
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
