import jsonApi from './postgresJsonApi';
import WrappingQueryBuilderOperation from '../WrappingQueryBuilderOperation';

export default class WhereJsonFieldPostgresOperation extends WrappingQueryBuilderOperation {

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
