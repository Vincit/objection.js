import _ from 'lodash';
import BelongsToOneRelateMethod from './BelongsToOneRelateMethod';

export default class BelongsToOneUnrelateMethod extends BelongsToOneRelateMethod {

  call(builder, args) {
    this.ids = [_.map(this.relation.ownerProp, id => null)];
    return true;
  }

  onAfterModelCreate(builder, result) {
    return result;
  }
}
