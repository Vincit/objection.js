import _ from 'lodash';
import QueryBuilderOperation from './QueryBuilderOperation';
import {afterReturn} from '../../utils/promiseUtils';

export default class DeleteOperation extends QueryBuilderOperation {

  constructor(builder, name, opt) {
    super(builder, name, opt);
    this.isWriteOperation = true;
  }

  onBuild(knexBuilder, builder) {
    knexBuilder.delete();
  }
}
