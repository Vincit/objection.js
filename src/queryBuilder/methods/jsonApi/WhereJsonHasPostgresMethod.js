import _ from 'lodash';
import jsonApi from './postgresJsonApi';
import ArgumentQueryBuilderMethod from '../ArgumentQueryBuilderMethod';

export default class WhereJsonHasPostgresMethod extends ArgumentQueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    /**
     * @type {string}
     */
    this.sql = null;
  }

  call(builder, args) {
    super.call(builder, args);

    this.sql = jsonApi.whereJsonFieldRightStringArrayOnLeftQuery(builder, this.args[0], this.opt.operator, this.args[1]);

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
