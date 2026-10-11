'use strict';

const { ManyToManyModifyMixin } = require('./ManyToManyModifyMixin');

// We need to override this mixin for mysql because mysql doesn't allow a
// statement that modifies the join table to read the join table in a
// subquery (ER_UPDATE_TABLE_USED), e.g. through the user's filters, or the
// related table if a trigger on the join table modifies it
// (ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG).
//
// So the owner and related ids of the join rows that match the filters are
// fetched in a separate query before the statement, which then only modifies
// the join rows with these ids. Unlike the subquery, these can't tell apart
// join rows that only differ in their other columns (#1853).
//
// https://stackoverflow.com/a/2314264/3729316
const ManyToManyMySqlModifyMixin = (Operation) => {
  return class extends ManyToManyModifyMixin(Operation) {
    applyModifyFilterForJoinTable(builder) {
      const { joinTableOwnerProp, joinTableRelatedProp } = this.relation;
      const ownerValues = this.owner.getProps(this.relation);
      const subquery = this.joinRowFilterSubquery;

      return builder
        .whereInComposite(joinTableOwnerProp.refs(builder), ownerValues)
        .runBefore(async (_, builder) => {
          const idRefs = [
            ...joinTableOwnerProp.refs(builder),
            ...joinTableRelatedProp.refs(builder),
          ];

          // Fetch the raw rows: no models, so that no hooks run for them.
          const rows = await builder
            .modelClass()
            .query()
            .childQueryOf(builder)
            .copyFrom(builder, builder.constructor.WhereSelector)
            .whereExists(subquery)
            .select(idRefs)
            .toKnexQuery();

          // An empty list still executes the query, so that it returns the
          // expected result for the dialect, e.g. a count of 0 for deletes.
          builder.whereInComposite(
            idRefs,
            rows.map((row) => Object.values(row)),
          );
        });
    }
  };
};

module.exports = {
  ManyToManyMySqlModifyMixin,
};
