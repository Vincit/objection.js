import _ from 'lodash';
import QueryBuilderOperation from './QueryBuilderOperation';
import {afterReturn} from '../../utils/promiseUtils';

export default class UpdateOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.model = null;
    this.modelOptions = this.opt.modelOptions || {};
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
    const update = _.omit(json, builder.modelClass().getIdColumnArray());
    knexBuilder.update(update);
  }

  onAfterInternal(builder, numUpdated) {
    const maybePromise = this.model.$afterUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, numUpdated);
  }
}
