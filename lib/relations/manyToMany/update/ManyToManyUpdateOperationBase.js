'use strict';

const { UpdateOperation } = require('../../../queryBuilder/operations/UpdateOperation');
const { addWhereGroup } = require('../../../queryBuilder/whereGroups');
const { chunk } = require('../../../utils/objectUtils');

// Stay below the limits of bound values per statement of SQLite before 3.32
// (999) and SQL Server (2100), leaving room for the patched values:
const maxBatchValues = 500;

class ManyToManyUpdateOperationBase extends UpdateOperation {
  constructor(name, opt) {
    super(name, opt);

    this.relation = opt.relation;
    this.owner = opt.owner;

    this.hasExtraProps = false;
    this.relatedIdsQuery = null;
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

  onBuild(builder) {
    if (this.modifiesJoinTable && this.modifyFilterSubquery) {
      // The related rows to update are identified by their ids first, see
      // `onAfterBuild()`.
      this.relatedIdsQuery = this.createRelatedIdsQuery(builder);
    }

    return super.onBuild(builder);
  }

  // Selects the ids of the related rows to update. Fetch raw rows, so that no
  // hooks run for them.
  createRelatedIdsQuery(builder) {
    const relatedIdsQuery = this.relation.relatedModelClass.query().childQueryOf(builder);
    const idRefs = this.relation.relatedModelClass.getIdRelationProperty().refs(relatedIdsQuery);

    return this.applyModifyFilterForRelatedTable(relatedIdsQuery).select(idRefs);
  }

  // Update the join rows before the related rows, while the filters still
  // match them (#161). A query resolved without updating anything, e.g. with
  // `none()`, leaves the join rows untouched too.
  async onAfterBuild(builder) {
    if (this.hasExtraProps && !this.isResolvedWithoutUpdate(builder)) {
      if (this.relatedIdsQuery) {
        // The filters can also reference the extras that the join rows change,
        // so identify the related rows to modify first.
        const rows = await this.relatedIdsQuery.toKnexQuery();
        this.relatedIds = rows.map((row) => Object.values(row));
      }

      if (this.relatedIdsQuery?.has(/^(limit|offset)$/)) {
        // The filters match the join rows of more related rows than the limit
        // picks, so only update the join rows of the picked ones.
        for (const ids of this.relatedIdBatches()) {
          await this.updateJoinRows(builder, ids);
        }
      } else {
        await this.updateJoinRows(builder);
      }
    }
  }

  updateJoinRows(builder, relatedIds = null) {
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
    if (relatedIds) {
      addWhereGroup(joinTableUpdateQuery, () =>
        joinTableUpdateQuery.whereInComposite(
          this.relation.joinTableRelatedProp.refs(joinTableUpdateQuery),
          relatedIds,
        ),
      );
    }
    addWhereGroup(joinTableUpdateQuery, () =>
      joinTableUpdateQuery.modify(this.relation.joinTableModify),
    );

    return joinTableUpdateQuery;
  }

  // Update the related rows in batches of their ids, as databases limit the
  // number of values in one statement.
  queryBatches(builder) {
    if (this.relatedIds) {
      const batches = this.relatedIdBatches();
      // Without ids, still execute the query once for the dialect's result:
      return batches.length > 0 ? batches : [[]];
    } else {
      return null;
    }
  }

  relatedIdBatches() {
    const idSize = this.relation.relatedModelClass.getIdRelationProperty().size;
    return chunk(this.relatedIds, Math.floor(maxBatchValues / idSize));
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
    clone.relatedIdsQuery = this.relatedIdsQuery;
    clone.relatedIds = this.relatedIds;
    clone.joinTablePatch = this.joinTablePatch;
    clone.joinTablePatchFilterQuery = this.joinTablePatchFilterQuery;

    return clone;
  }
}

module.exports = {
  ManyToManyUpdateOperationBase,
};
