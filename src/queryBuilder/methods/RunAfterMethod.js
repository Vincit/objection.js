import _ from 'lodash';
import QueryBuilderMethod from './QueryBuilderMethod';

export default class RunAfterMethod extends QueryBuilderMethod {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onAfter(builder, result) {
    return this.func.call(builder, result, builder);
  }
}
