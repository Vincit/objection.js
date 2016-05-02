import _ from 'lodash';
import WrappingQueryBuilderOperation from './WrappingQueryBuilderOperation';

export default class KnexOperation extends WrappingQueryBuilderOperation {

  onBuild(builder) {
    if (_.isFunction(builder[this.name])) {
      builder[this.name].apply(builder, this.args);
    } else {
      throw new Error(`knex doesn't have the method '${this.name}'`);
    }
  }
}