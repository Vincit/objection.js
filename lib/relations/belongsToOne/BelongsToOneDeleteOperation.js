'use strict';

const { RelationDeleteOperation } = require('../RelationDeleteOperation');

class BelongsToOneDeleteOperation extends RelationDeleteOperation {
  onAfter1(_, result) {
    if (this.owner.isModels) {
      const ownerProp = this.relation.ownerProp;

      for (const owner of this.owner.modelArray) {
        ownerProp.forEach((i) => {
          ownerProp.setProp(owner, i, null);
        });
      }
    }

    return result;
  }
}

module.exports = {
  BelongsToOneDeleteOperation,
};
