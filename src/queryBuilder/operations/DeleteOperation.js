import QueryBuilderOperation from './QueryBuilderOperation';

export default class DeleteOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.isWriteOperation = true;
  }

  onBuild(knexBuilder, builder) {
    knexBuilder.delete();
  }
}
