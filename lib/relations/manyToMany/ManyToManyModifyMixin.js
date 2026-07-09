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
//
// If the subquery is not needed at all (e.g. the query has only a findById(s) operation - usually coming from graph upsert) - skip it
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
      // Check if the subquery is needed
      // - it may not be, if there are no operations other than findById(s) on the main query
      // and proceed only if passed builder operates on the joinTable
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
      const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);
      const joinTableRelatedRefs = this.relation.joinTableRelatedProp.refs(builder);
      const ownerValues = this.owner.getProps(this.relation);

      if (this.modifyFilterSubquery) {
        // if subquery is used (in a non-find query)
        const relatedRefs = this.relation.relatedProp.refs(builder);
        const subquery = this.modifyFilterSubquery.clone().select(relatedRefs);

        if (isMySql(builder.knex())) {
          // and only for mysql:
          // extract the subquery selecting related ids to separate query run before the main query
          // to avoid ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG mysql error
          // when executing a db trigger on a join table which updates related table
          //
          // This workaround is only needed for MySQL.
          // It could possibly be applied to all DBMS, if proven necessary,
          // but others seem to handle such cases just fine.
          //
          // https://stackoverflow.com/a/2314264/3729316
          // "MySQL triggers can't manipulate the table they are assigned to.
          // All other major DBMS support this feature so hopefully MySQL will add this support soon."
          // ~ Cory House, 2010
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
        } else {
          builder.whereInComposite(joinTableRelatedRefs, subquery);
        }
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

      return builder.whereInComposite(joinTableOwnerRefs, ownerValues);
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
