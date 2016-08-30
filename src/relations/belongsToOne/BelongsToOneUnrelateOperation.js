import BelongsToOneRelateOperation from './BelongsToOneRelateOperation';

export default class BelongsToOneUnrelateOperation extends BelongsToOneRelateOperation {

  call(builder, args) {
    const ids = new Array(this.relation.ownerProp.length);

    for (let i = 0, l = this.relation.ownerProp.length; i < l; ++i) {
      ids[i] = null;
    }

    this.ids = [ids];
    return true;
  }

  onAfterInternal(builder, result) {
    return result;
  }
}
