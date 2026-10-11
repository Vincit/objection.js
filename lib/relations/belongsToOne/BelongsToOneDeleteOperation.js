'use strict';

const { RelationDeleteOperation } = require('../RelationDeleteOperation');

class BelongsToOneDeleteOperation extends RelationDeleteOperation {
  onAfter1(builder, result) {
    // A query resolved without executing it, e.g. with `none()`, deleted
    // nothing, so the owners are left untouched.
    if (this.owner.isModels && !builder.isExplicitlyResolvedOrRejected()) {
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
