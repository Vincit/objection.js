import QueryBuilderMethod from './QueryBuilderMethod';

export default class InstanceFindMethod extends QueryBuilderMethod {

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