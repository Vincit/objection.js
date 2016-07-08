import _ from 'lodash';
import DelegateOperation from './DelegateOperation';
import {afterReturn} from '../../utils/promiseUtils';
import {isPostgres} from '../../utils/dbUtils';

export default class UpdateAndFetchOperation extends DelegateOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.id = null;
  }

  get model() {
    return this.delegate.model;
  }

  call(builder, args) {
    this.id = args[0];
    return this.delegate.call(builder, args.slice(1));
  }

  onBeforeBuild(builder) {
    super.onBeforeBuild(builder);
    builder.whereComposite(builder.modelClass().getFullIdColumn(), this.id);
  }

  onAfterInternal(builder, result) {
    return builder.modelClass()
      .query()
      .childQueryOf(builder)
      .whereComposite(builder.modelClass().getFullIdColumn(), this.id)
      .first()
      .then(fetched => {
        let retVal = null;

        if (fetched) {
          this.model.$set(fetched);
          retVal = this.model;
        }

        return afterReturn(super.onAfterInternal(builder, result), retVal);
      });
  }
}
