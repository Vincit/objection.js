'use strict';

const UpdateOperation = require('../../queryBuilder/operations/UpdateOperation');

class ManyToManyUpdateOperationBase extends UpdateOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;

    this.hasExtraProps = false;
    this.joinTablePatch = {};
    this.joinTablePatchFilterQuery = null;
  }

  onAdd(builder, args) {
    const modelClass = builder.modelClass();
    const obj = args[0];

    // Copy all extra properties to the `joinTablePatch` object.
    for (let i = 0; i < this.relation.joinTableExtras.length; ++i) {
      const extra = this.relation.joinTableExtras[i];

      if (extra.aliasProp in obj) {
        this.hasExtraProps = true;
        this.joinTablePatch[extra.joinTableProp] = obj[extra.aliasProp];
      }
    }

    const res = super.onAdd(builder, args);

    if (this.hasExtraProps) {
      // Make sure we don't try to insert the extra properties
      // to the target table.
      this.relation.omitExtraProps([this.model]);
    }

    return res;
  }
}

module.exports = ManyToManyUpdateOperationBase;
