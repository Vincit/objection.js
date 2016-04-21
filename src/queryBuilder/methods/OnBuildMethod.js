import _ from 'lodash';
import QueryBuilderMethod from './QueryBuilderMethod';

export default class OnBuildMethod extends QueryBuilderMethod {

  call(builder, args) {
    this.func = args[0];
    return true;
  }

  onBeforeBuild(builder) {
    return this.func.call(builder, builder);
  }
}
