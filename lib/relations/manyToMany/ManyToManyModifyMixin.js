'use strict';

const { ManyToManyFindOperation } = require('./find/ManyToManyFindOperation');
const { addWhereGroup } = require('../../queryBuilder/whereGroups');
const { withoutOrder } = require('../../queryBuilder/withoutOrder');

// This mixin contains the shared code for all modify operations (update, delete, relate, unrelate)
// for ManyToManyRelation operations.
//
// The most important thing this mixin does is that it moves the filters from the main query
// into a subquery and then adds a single where clause that uses the subquery. This is done so
// that we are able to `innerJoin` the join table to the query. Most SQL engines don't allow
// joins in updates or deletes. Join table is joined so that queries can reference the join
// table columns.
const ManyToManyModifyMixin = (Operation) => {
  return class extends Operation {
    constructor(...args) {
      super(...args);
      this.modifyFilterSubquery = null;
      this.joinRowFilterSubquery = null;
      this.skipRelationFilter = false;
    }

    // Unrelate doesn't execute the main query, and updates of rows that are
    // known to be related, like the patches of `upsertGraph()`, keep their own
    // filters (#135).
    get modifyMainQuery() {
      return !this.modifiesJoinTableOnly && !this.skipRelationFilter;
    }

    // At this point `builder` should only have the user's own wheres and joins. There can
    // be other operations (like orderBy) too, but those are meaningless with modify operations.
    onBuild(builder) {
      if (this.modifiesJoinTable && !this.skipRelationFilter) {
        this.joinRowFilterSubquery = this.createJoinRowFilterSubquery(builder);
      }

      if (this.modifyMainQuery) {
        this.modifyFilterSubquery = this.createModifyFilterSubquery(builder);

        // We can now remove the where and join statements from the main query.
        this.removeFiltersFromMainQuery(builder);

        // Add a single where clause that uses the created subquery. Updates
        // that modify the join rows too use the ids that `onAfterBuild` fetches
        // instead, which the callback reads when the SQL is created (#161).
        addWhereGroup(builder, () =>
          this.modifiesJoinTable
            ? builder.where((builder) =>
                this.relatedIds
                  ? this.applyIdFilterForRelatedTable(builder)
                  : this.applyModifyFilterForRelatedTable(builder),
              )
            : this.applyModifyFilterForRelatedTable(builder),
        );
      }

      return super.onBuild(builder);
    }

    createModifyFilterSubquery(builder) {
      const relatedModelClass = this.relation.relatedModelClass;
      const builderClass = builder.constructor;

      // Create an empty subquery.
      const modifyFilterSubquery = relatedModelClass.query().childQueryOf(builder);

      // Add the necessary joins and wheres so that only rows related to
      // `this.owner` are selected.
      this.relation.findQuery(modifyFilterSubquery, this.owner);

      // Copy all where and join statements from the main query to the subquery.
      modifyFilterSubquery
        .copyFrom(builder, builderClass.WhereSelector)
        .copyFrom(builder, builderClass.JoinSelector);

      return withoutOrder(modifyFilterSubquery.clearSelect());
    }

    removeFiltersFromMainQuery(builder) {
      const builderClass = builder.constructor;

      builder.clear(builderClass.WhereSelector);
      builder.clear(builderClass.JoinSelector);
    }

    applyModifyFilterForRelatedTable(builder) {
      const idRefs = this.relation.relatedModelClass.getIdRelationProperty().refs(builder);
      const subquery = this.modifyFilterSubquery.clone().select(idRefs);

      return builder.whereInComposite(idRefs, subquery);
    }

    applyIdFilterForRelatedTable(builder) {
      const idRefs = this.relation.relatedModelClass.getIdRelationProperty().refs(builder);
      return builder.whereInComposite(idRefs, this.relatedIds);
    }

    // Only modifies the join rows that match the filters (#1853).
    applyModifyFilterForJoinTable(builder) {
      const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);
      const ownerValues = this.owner.getProps(this.relation);

      return builder
        .whereInComposite(joinTableOwnerRefs, ownerValues)
        .whereExists(this.joinRowFilterSubquery);
    }

    // Selects the related rows of a join row that match the filters. The join
    // table isn't joined, so that the filters on its columns apply to the join
    // row of the outer query.
    createJoinRowFilterSubquery(builder) {
      const { relation } = this;
      const builderClass = builder.constructor;
      const subquery = relation.relatedModelClass.query().childQueryOf(builder);
      const joinTableRef = builder.tableRefFor(relation.joinTable);

      addWhereGroup(subquery, () => {
        relation.relatedProp.forEach((i) => {
          const relatedRef = relation.relatedProp.ref(subquery, i);
          const joinTableRelatedRef = relation.joinTableRelatedProp.ref(subquery, i);

          subquery.where(relatedRef, joinTableRelatedRef.table(joinTableRef));
        });
      });

      return withoutOrder(
        relation
          .applyModify(subquery)
          .copyFrom(builder, builderClass.WhereSelector)
          .copyFrom(builder, builderClass.JoinSelector)
          .select(1),
      );
    }

    toFindOperation() {
      const opt = {
        relation: this.relation,
        owner: this.owner,
      };

      if (this.modifyMainQuery && this.modifyFilterSubquery) {
        // `onBuild` has already moved the main query's filters into the
        // subquery and removed them. Apply them to the find query too.
        // See issue #2266.
        return new ManyToManyModifyFindOperation('find', { ...opt, modifyOperation: this });
      } else {
        return new ManyToManyFindOperation('find', opt);
      }
    }

    clone() {
      const clone = super.clone();
      clone.modifyFilterSubquery = this.modifyFilterSubquery;
      clone.joinRowFilterSubquery = this.joinRowFilterSubquery;
      clone.skipRelationFilter = this.skipRelationFilter;
      return clone;
    }
  };
};

class ManyToManyModifyFindOperation extends ManyToManyFindOperation {
  onBuild(builder) {
    const { modifyOperation } = this.opt;
    super.onBuild(builder);

    addWhereGroup(builder, () =>
      modifyOperation.relatedIds
        ? modifyOperation.applyIdFilterForRelatedTable(builder)
        : modifyOperation.applyModifyFilterForRelatedTable(builder),
    );
  }
}

module.exports = {
  ManyToManyModifyMixin,
};
