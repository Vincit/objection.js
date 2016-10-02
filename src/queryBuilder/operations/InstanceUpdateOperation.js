import UpdateOperation from './UpdateOperation';
import {after} from '../../utils/promiseUtils';

export default class InstanceUpdateOperation extends UpdateOperation {

  constructor(name, opt) {
    super(name, opt);

    this.instance = opt.instance;
    this.modelOptions.old = opt.instance;
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
    const maybePromise = super.onAfterInternal(builder, numUpdated);
    return after(maybePromise, result => {
      this.instance.$set(this.model);
      return result;
    });
  }
}