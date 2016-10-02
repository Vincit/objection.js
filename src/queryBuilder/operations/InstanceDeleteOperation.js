import DeleteOperation from './DeleteOperation';
import {afterReturn} from '../../utils/promiseUtils';

export default class InstanceDeleteOperation extends DeleteOperation {

  constructor(name, opt) {
    super(name, opt);
    this.instance = opt.instance;
  }

  onBeforeInternal(builder, result) {
    const maybePromise = this.instance.$beforeDelete(builder.context());
    return afterReturn(maybePromise, result);
  }

  onBeforeBuild(builder) {
    super.onBeforeBuild(builder);
    builder.whereComposite(builder.modelClass().getFullIdColumn(), this.instance.$id());
  }

  onAfterInternal(builder, result) {
    const maybePromise = this.instance.$afterDelete(builder.context());
    return afterReturn(maybePromise, result);
  }
}