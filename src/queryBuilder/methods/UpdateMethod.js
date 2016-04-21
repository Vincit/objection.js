import _ from 'lodash';
import QueryBuilderMethod from './QueryBuilderMethod';
import {afterReturn} from '../../utils/promiseUtils';

export default class UpdateMethod extends QueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);

    this.model = null;
    this.modelOptions = this.opt.modelOptions || {};
    this.isWriteMethod = true;
  }

  call(builder, args) {
    this.model = builder.modelClass().ensureModel(args[0], this.modelOptions);
    return true;
  }

  onBeforeBack(builder, result) {
    const maybePromise = this.model.$beforeUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, result);
  }

  onBuild(knexBuilder, builder) {
    const json = this.model.$toDatabaseJson();
    const update = _.omit(json, builder.modelClass().getIdColumnArray());
    knexBuilder.update(update);
  }

  onAfterModelCreate(builder, numUpdated) {
    const maybePromise = this.model.$afterUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, numUpdated);
  }
}
