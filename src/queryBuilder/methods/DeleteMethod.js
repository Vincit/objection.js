import _ from 'lodash';
import QueryBuilderMethod from './QueryBuilderMethod';
import {afterReturn} from '../../utils/promiseUtils';

export default class DeleteMethod extends QueryBuilderMethod {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.isWriteMethod = true;
  }

  onBuild(knexBuilder, builder) {
    knexBuilder.delete();
  }
}
