import QueryBuilderOperation from './QueryBuilderOperation';

export default class DeleteOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);
    this.isWriteOperation = true;
  }

  onBuild(knexBuilder, builder) {
    knexBuilder.delete();
  }
}
