import _ from 'lodash';
import QueryBuilderMethod from './QueryBuilderMethod';

export default class RunBeforeMethod extends QueryBuilderMethod {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onBefore(builder, result) {
    return this.func.call(builder, result, builder);
  }
}
