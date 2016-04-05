import _ from 'lodash';
import ArgumentQueryBuilderMethod from './ArgumentQueryBuilderMethod';

export default class KnexMethod extends ArgumentQueryBuilderMethod {

  onBuild(builder) {
    if (_.isFunction(builder[this.name])) {
      builder[this.name].apply(builder, this.args);
    } else {
      throw new Error(`knex doesn't have the method '${this.name}'`);
    }
  }
}