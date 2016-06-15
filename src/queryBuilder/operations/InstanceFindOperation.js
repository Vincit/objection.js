import FindOperation from './FindOperation';

export default class InstanceFindOperation extends FindOperation {

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