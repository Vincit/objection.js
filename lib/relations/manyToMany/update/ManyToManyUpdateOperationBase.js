const UpdateOperation = require('../../../queryBuilder/operations/UpdateOperation');

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

  onBefore3(builder) {
    const row = this.model.$toDatabaseJson(builder);

    if (Object.keys(row).length === 0) {
      // Resolve the main query if there is nothing to update. We still
      // need to continue executing this query since we may have `extra`
      // properties to update in `onAfter1`.
      builder.resolve([0]);
    }

    return super.onBefore3(builder);
  }

  onAfter1(builder, result) {
    if (this.hasExtraProps) {
      const joinTableUpdateQuery = this.relation
        .getJoinModelClass(builder.knex())
        .query()
        .childQueryOf(builder)
        .patch(this.joinTablePatch);

      return this.applyModifyFilterForJoinTable(joinTableUpdateQuery).return(result);
    } else {
      return result;
    }
  }

  /* istanbul ignore next */
  applyModifyFilterForRelatedTable(builder) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  applyModifyFilterForJoinTable(builder) {
    throw new Error('not implemented');
  }
}

module.exports = ManyToManyUpdateOperationBase;
