'use strict';

const { UpdateOperation } = require('../../../queryBuilder/operations/UpdateOperation');
const { addWhereGroup } = require('../../../queryBuilder/whereGroups');

class ManyToManyUpdateOperationBase extends UpdateOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;

    this.hasExtraProps = false;
    this.relatedIds = null;
    this.joinTablePatch = {};
    this.joinTablePatchFilterQuery = null;
  }

  get modifiesJoinTable() {
    return this.hasExtraProps;
  }

  onAdd(builder, args) {
    const obj = args[0];

    // The modified rows are known to be related to the owner, so they are
    // filtered by their own ids instead of a subquery that joins the join
    // table. On MySQL, concurrent updates with that subquery deadlock (#135).
    this.skipRelationFilter = builder.internalOptions().skipRelationFilter;

    // Copy all extra properties to the `joinTablePatch` object.
    for (const extra of this.relation.joinTableExtras) {
      if (extra.aliasProp in obj) {
        this.hasExtraProps = true;
        this.joinTablePatch[extra.joinTableProp] = obj[extra.aliasProp];
      }
    }

    if (this.hasExtraProps) {
      this.relation.assertCanModifyJoinTable(builder, `${this.name} with extra properties`);
    }

    const res = super.onAdd(builder, args);

    if (this.hasExtraProps) {
      // Make sure we don't try to insert the extra properties
      // to the target table.
      this.relation.omitExtraProps([this.model]);
    }

    return res;
  }

  // Update the join rows before the related rows, while the filters still
  // match them (#161). A query resolved without updating anything, e.g. with
  // `none()`, leaves the join rows untouched too.
  async onAfterBuild(builder) {
    if (this.hasExtraProps && !this.isResolvedWithoutUpdate(builder)) {
      if (this.modifyFilterSubquery && !this.hasNothingToUpdate) {
        // The filters can also reference the extras that the join rows change,
        // so identify the related rows to update first. Fetch raw rows, so that
        // no hooks run for them:
        const idRefs = this.relation.relatedModelClass.getIdRelationProperty().refs(builder);
        const rows = await this.modifyFilterSubquery.clone().select(idRefs).toKnexQuery();

        this.relatedIds = rows.map((row) => Object.values(row));
      }

      const joinTableUpdateQuery = this.relation
        .getJoinModelClass(builder.knex())
        .query()
        .childQueryOf(builder)
        .patch(this.joinTablePatch);

      addWhereGroup(joinTableUpdateQuery, () =>
        this.skipRelationFilter
          ? this.applyIdFilterForJoinTable(joinTableUpdateQuery)
          : this.applyModifyFilterForJoinTable(joinTableUpdateQuery),
      );
      addWhereGroup(joinTableUpdateQuery, () =>
        joinTableUpdateQuery.modify(this.relation.joinTableModify),
      );

      await joinTableUpdateQuery;
    }
  }

  // Filters the join rows by the ids of the owner and the updated model.
  applyIdFilterForJoinTable(builder) {
    return builder
      .whereInComposite(
        this.relation.joinTableOwnerProp.refs(builder),
        this.owner.getProps(this.relation),
      )
      .whereComposite(
        this.relation.joinTableRelatedProp.refs(builder),
        this.relation.relatedProp.getProps(this.model),
      );
  }

  /* istanbul ignore next */
  applyModifyFilterForRelatedTable(builder) {
    throw new Error('not implemented');
  }

  /* istanbul ignore next */
  applyModifyFilterForJoinTable(builder) {
    throw new Error('not implemented');
  }

  clone() {
    const clone = super.clone();

    clone.hasExtraProps = this.hasExtraProps;
    clone.relatedIds = this.relatedIds;
    clone.joinTablePatch = this.joinTablePatch;
    clone.joinTablePatchFilterQuery = this.joinTablePatchFilterQuery;

    return clone;
  }
}

module.exports = {
  ManyToManyUpdateOperationBase,
};
