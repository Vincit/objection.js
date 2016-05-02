import _ from 'lodash';
import BelongsToOneRelateOperation from './BelongsToOneRelateOperation';

export default class BelongsToOneUnrelateOperation extends BelongsToOneRelateOperation {

  call(builder, args) {
    this.ids = [_.map(this.relation.ownerProp, id => null)];
    return true;
  }

  onAfterInternal(builder, result) {
    return result;
  }
}
