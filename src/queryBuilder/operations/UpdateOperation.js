import clone from 'lodash/clone';
import omit from 'lodash/omit';
import QueryBuilderOperation from './QueryBuilderOperation';
import {afterReturn} from '../../utils/promiseUtils';

export default class UpdateOperation extends QueryBuilderOperation {

  constructor(name, opt) {
    super(name, opt);

    this.model = null;
    this.modelOptions = clone(this.opt.modelOptions) || {};
    this.isWriteOperation = true;
  }

  call(builder, args) {
    this.model = builder.modelClass().ensureModel(args[0], this.modelOptions);
    return true;
  }

  onBeforeInternal(builder, result) {
    const maybePromise = this.model.$beforeUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, result);
  }

  onBuild(knexBuilder, builder) {
    const json = this.model.$toDatabaseJson();
    const update = omit(json, builder.modelClass().getIdColumnArray());
    knexBuilder.update(update);
  }

  onAfterInternal(builder, numUpdated) {
    const maybePromise = this.model.$afterUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, numUpdated);
  }
}
