import clone from 'lodash/clone';
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
    const cols = builder.modelClass().getIdColumnArray();

    for (let i = 0, l = cols.length; i < l; ++i) {
      const col = cols[i];
      delete json[col];
    }

    knexBuilder.update(json);
  }

  onAfterInternal(builder, numUpdated) {
    const maybePromise = this.model.$afterUpdate(this.modelOptions, builder.context());
    return afterReturn(maybePromise, numUpdated);
  }
}
