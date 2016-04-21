import _ from 'lodash';
import jsonApi from './postgresJsonApi';
import ArgumentQueryBuilderMethod from '../ArgumentQueryBuilderMethod';

export default class WhereJsonFieldPostgresMethod extends ArgumentQueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    /**
     * @type {string}
     */
    this.sql = null;
  }

  call(builder, args) {
    super.call(builder, args);

    this.sql = jsonApi.whereJsonFieldQuery(builder.knex(), this.args[0], this.args[1], this.args[2]);

    return true;
  }

  onBuild(knexBuilder) {
    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw(this.sql);
    } else {
      knexBuilder.whereRaw(this.sql);
    }
  }
}
