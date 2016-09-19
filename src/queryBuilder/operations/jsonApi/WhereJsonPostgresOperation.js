import jsonApi from './postgresJsonApi';
import WrappingQueryBuilderOperation from '../WrappingQueryBuilderOperation';

export default class WhereJsonPostgresOperation extends WrappingQueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    /**
     * @type {Array.<string>}
     */
    this.rawArgs = null;
  }

  call(builder, args) {
    super.call(builder, args);

    this.rawArgs = jsonApi.whereJsonbRefOnLeftJsonbValOrRefOnRightRawQueryParams(
      this.args[0],
      this.opt.operator,
      this.args[1],
      this.opt.prefix);

    return true;
  }

  onBuild(knexBuilder) {
    if (this.opt.bool === 'or') {
      knexBuilder.orWhereRaw.apply(knexBuilder, this.rawArgs);
    } else {
      knexBuilder.whereRaw.apply(knexBuilder, this.rawArgs);
    }
  }
}
