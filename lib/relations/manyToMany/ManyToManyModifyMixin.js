'use strict';

const { ManyToManyFindOperation } = require('./find/ManyToManyFindOperation');
const { isMySql } = require('../../utils/knexUtils');

const FindByIdSelector = /^findByIds?$/;
const RelateUnrelateSelector = /relate$/;

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
    }

    get modifyMainQuery() {
      return true;
    }

    // At this point `builder` should only have the user's own wheres and joins. There can
    // be other operations (like orderBy) too, but those are meaningless with modify operations.
    onBuild(builder) {
      this.modifyFilterSubquery = this.createModifyFilterSubquery(builder);

      if (this.modifyMainQuery && this.modifyFilterSubquery) {
        // We can now remove the where and join statements from the main query.
        this.removeFiltersFromMainQuery(builder);

        // Add a single where clause that uses the created subquery.
        this.applyModifyFilterForRelatedTable(builder);
      }

      return super.onBuild(builder);
    }

    createModifyFilterSubquery(builder) {
      // Check if the subquery is needed (it may be not if there are no operations other than findById(s) on the main query)
      // and only if passed builder belongs to joinTableModelClass
      if (builder.modelClass() === this.relation.joinTableModelClass) {
        const checkQuery = builder
          .clone()
          .toFindQuery()
          .modify(this.relation.modify)
          .clear(RelateUnrelateSelector)
          .clear(FindByIdSelector)
          .clearOrder();
        if (checkQuery.isSelectAll()) {
          return null;
        }
      }

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

      return modifyFilterSubquery.clearSelect();
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

    applyModifyFilterForJoinTable(builder) {
      const builderWithTriggerFix = this.applyManyToManyRelationTriggerFix(builder);
      // null here means fix is not applicable
      if (builderWithTriggerFix !== null) {
        return builderWithTriggerFix;
      }

      const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);
      const joinTableRelatedRefs = this.relation.joinTableRelatedProp.refs(builder);

      const relatedRefs = this.relation.relatedProp.refs(builder);
      const ownerValues = this.owner.getProps(this.relation);

      const subquery = this.modifyFilterSubquery.clone().select(relatedRefs);

      return builder
        .whereInComposite(joinTableRelatedRefs, subquery)
        .whereInComposite(joinTableOwnerRefs, ownerValues);
    }

    /**
     * Workaround for ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG mysql error
     * when a trigger on join table was operating on the related table
     * - targeting mysql only
     * - we return null if this fix is not applicable!
     * - filters/modify on join table of m2m relations
     * - if subquery is not needed at all (e.g. a query with just a findById(s) operation - usually coming from graph upsert) - skip it
     * - otherwise extract a subquery reading related ids to separate query run before the delete query for m2m unrelate operation
     *
     * This is an upgraded (to objection v3) version of:
     * - https://github.com/ovos/objection.js/pull/3
     * - https://github.com/ovos/objection.js/pull/1
     * Originally based on:
     * - https://github.com/ovos/objection.js/pull/2
     */
    applyManyToManyRelationTriggerFix(builder) {
      // this workaround is only needed for MySQL
      if (!isMySql(builder.knex())) {
        return null;
      }

      if (this.modifyFilterSubquery && builder.isFind()) {
        return null;
      }

      const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);
      const joinTableRelatedRefs = this.relation.joinTableRelatedProp.refs(builder);
      const ownerIds = this.relation.ownerProp.getProps(this.owner.owner);

      if (this.modifyFilterSubquery) {
        // if subquery is used (in a non-find query):
        // extract the subquery selecting related ids to separate query run before the main query
        // to avoid ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG mysql error
        // when executing a db trigger on a join table which updates related table
        const relatedRefs = this.relation.relatedProp.refs(builder);
        const subquery = this.modifyFilterSubquery.clone().select(relatedRefs);

        builder
          .runBefore(() => subquery.execute())
          .runBefore((related, builder) => {
            if (!related.length) {
              builder.resolve([]);
              return;
            }
            builder.whereInComposite(
              joinTableRelatedRefs,
              related.map((m) => m.$values(this.relation.relatedProp.props))
            );
          });
      } else if (builder.parentQuery()) {
        // if subquery is not used:
        // rewrite findById(s) from related table to join table
        builder.parentQuery().forEachOperation(FindByIdSelector, (op) => {
          if (op.name === 'findByIds') {
            builder.whereInComposite(joinTableRelatedRefs, op.ids);
          } else {
            builder.whereComposite(joinTableRelatedRefs, op.id);
          }
        });
      }

      return builder.whereComposite(joinTableOwnerRefs, ownerIds);
    }

    toFindOperation() {
      return new ManyToManyFindOperation('find', {
        relation: this.relation,
        owner: this.owner,
      });
    }

    clone() {
      const clone = super.clone();
      clone.modifyFilterSubquery = this.modifyFilterSubquery;
      return clone;
    }
  };
};

module.exports = {
  ManyToManyModifyMixin,
};
