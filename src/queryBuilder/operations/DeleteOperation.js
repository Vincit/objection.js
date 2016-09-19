import QueryBuilderOperation from './QueryBuilderOperation';

export default class DeleteOperation extends QueryBuilderOperation {

  constructor(knex, name, opt) {
    super(knex, name, opt);
    this.isWriteOperation = true;
  }

  onBuild(knexBuilder, builder) {
    knexBuilder.delete();
  }
}
