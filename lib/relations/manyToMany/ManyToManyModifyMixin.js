// This mixin contains the shared code for all modify operations (update, delete, relate, unrelate)
// for ManyToManyRelation operations.
//
// The most important thing this mixin does is that it moves the filters from the main query
// into a subquery and then adds a single where clause that uses the subquery. This is done so
// that we are able to `innerJoin` the join table to the query. Most SQL engines don't allow
// joins in updates or deletes. Join table is joined so that queries can reference the join
// table columns.
const ManyToManyModifyMixin = Operation => {
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

      if (this.modifyMainQuery) {
        // We can now remove the where and join statements from the main query.
        this.removeFiltersFromMainQuery(builder);

        // Add a single where clause that uses the created subquery.
        this.applyModifyFilterForRelatedTable(builder);
      }

      return super.onBuild(builder);
    }

    createModifyFilterSubquery(builder) {
      const relatedModelClass = this.relation.relatedModelClass;
      const builderClass = builder.constructor;
      const ownerProp = this.relation.ownerProp;
      const ownerIds = [ownerProp.getProps(this.owner)];

      // Create an empty subquery.
      const modifyFilterSubquery = relatedModelClass.query().childQueryOf(builder);

      // Add the necessary joins and wheres so that only rows related to
      // `this.owner` are selected.
      this.relation.findQuery(modifyFilterSubquery, { ownerIds });

      // Copy all where and join statements from the main query to the subquery.
      modifyFilterSubquery
        .copyFrom(builder, builderClass.WhereSelector)
        .copyFrom(builder, builderClass.JoinSelector);

      return modifyFilterSubquery;
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

      const relatedRefs = this.relation.relatedProp.refs(builder);
      const ownerIds = this.relation.ownerProp.getProps(this.owner);

      const subquery = this.modifyFilterSubquery.clone().select(relatedRefs);

      return builder
        .whereInComposite(joinTableRelatedRefs, subquery)
        .whereComposite(joinTableOwnerRefs, ownerIds);
    }
  };
};

module.exports = ManyToManyModifyMixin;
