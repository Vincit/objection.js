import UpdateOperation from './UpdateOperation';

export default class InstanceUpdateOperation extends UpdateOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.instance = opt.instance;
  }

  call(builder, args) {
    const retVal = super.call(builder, args);

    if (!this.model) {
      this.model = this.instance;
    }

    return retVal;
  }

  onBeforeBuild(builder) {
    super.onBeforeBuild(builder);
    builder.whereComposite(builder.modelClass().getFullIdColumn(), this.instance.$id());
  }

  onAfterInternal(builder, numUpdated) {
    this.instance.$set(this.model);
    return super.onAfterInternal(builder, numUpdated);
  }
}