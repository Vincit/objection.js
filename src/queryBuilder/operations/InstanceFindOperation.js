import QueryBuilderOperation from './QueryBuilderOperation';

export default class InstanceFindOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.instance = opt.instance;
  }

  onBeforeBuild(builder) {
    builder
      .whereComposite(builder.modelClass().getFullIdColumn(), this.instance.$id())
      .first()
  }
}