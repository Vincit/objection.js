'use strict';

const { RelationDeleteOperation } = require('../RelationDeleteOperation');

class BelongsToOneDeleteOperation extends RelationDeleteOperation {
  onAfter1(_, result) {
    if (this.owner.isModels) {
      const ownerProp = this.relation.ownerProp;

      this.owner.modelArray.forEach(owner => {
        for (let i = 0, l = ownerProp.size; i < l; ++i) {
          ownerProp.setProp(owner, i, null);
        }
      });
    }

    return result;
  }
}

module.exports = {
  BelongsToOneDeleteOperation
};
