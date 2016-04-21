import _ from 'lodash';
import DelegateMethod from './DelegateMethod';
import InsertWithRelated from '../InsertWithRelated';
import {afterReturn} from '../../utils/promiseUtils';
import {isPostgres} from '../../utils/dbUtils';

export default class UpdateAndFetchMethod extends DelegateMethod {

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

  onAfterModelCreate(builder, result) {
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

        return afterReturn(super.onAfterModelCreate(builder, result), retVal);
      });
  }
}
