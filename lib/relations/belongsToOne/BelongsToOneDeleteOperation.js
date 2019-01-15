'use strict';

const { RelationDeleteOperation } = require('../RelationDeleteOperation');

class BelongsToOneDeleteOperation extends RelationDeleteOperation {
  onAfter1(_, result) {
    const ownerProp = this.relation.ownerProp;

    for (let i = 0, l = ownerProp.size; i < l; ++i) {
      ownerProp.setProp(this.owner, i, null);
    }

    return result;
  }
}

module.exports = {
  BelongsToOneDeleteOperation
};
