import DeleteMethod from './DeleteMethod';

export default class InstanceDeleteMethod extends DeleteMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.instance = opt.instance;
  }

  onBeforeBuild(builder) {
    super.onBeforeBuild(builder);
    builder.whereComposite(builder.modelClass().getFullIdColumn(), this.instance.$id());
  }
}