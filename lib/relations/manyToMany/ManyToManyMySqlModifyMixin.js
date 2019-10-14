'use strict';

const { ManyToManyModifyMixin } = require('./ManyToManyModifyMixin');

const FindByIdSelector = /^findByIds?$/;
const RelateUnrelateSelector = /relate$/;

// We need to override this mixin for mysql because mysql doesn't
// allow referencing the updated/deleted table directly in a subquery.
// We need to wrap the subquery into yet another subquery (sigh).
const ManyToManyMySqlModifyMixin = Operation => {
  return class extends ManyToManyModifyMixin(Operation) {
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

      const modifyFilterSubquery = super.createModifyFilterSubquery(builder);
      return this.wrapIntoYetAnotherSubquery(builder, modifyFilterSubquery);
    }

    wrapIntoYetAnotherSubquery(builder, modifyFilterSubquery) {
      const relatedModelClass = this.relation.relatedModelClass;
      const tableRef = builder.tableRefFor(relatedModelClass.getTableName());

      return relatedModelClass
        .query()
        .childQueryOf(builder)
        .from(modifyFilterSubquery.as(tableRef));
    }

    applyModifyFilterForJoinTable(builder) {
      if (this.modifyFilterSubquery && builder.isFind()) {
        return super.applyModifyFilterForJoinTable(builder);
      }

      const joinTableOwnerRefs = this.relation.joinTableOwnerProp.refs(builder);
      const joinTableRelatedRefs = this.relation.joinTableRelatedProp.refs(builder);
      const ownerIds = this.relation.ownerProp.getProps(this.owner);

      if (this.modifyFilterSubquery) {
        // if subquery is used (in a non-find query):
        // extract the subquery selecting related ids to separate query run before the main query
        // to avoid ER_CANT_UPDATE_USED_TABLE_IN_SF_OR_TRG mysql error
        // when executing a db trigger on a join table which updates related table
        const relatedRefs = this.relation.relatedProp.refs(builder);
        const subquery = this.modifyFilterSubquery.clone().select(relatedRefs);

        builder.runBefore(() => subquery.execute()).runBefore((related, builder) => {
          if (!related.length) {
            builder.resolve([]);
            return;
          }
          builder.whereInComposite(
            joinTableRelatedRefs,
            related.map(m => m.$values(this.relation.relatedProp.props))
          );
        });
      } else if (builder.parentQuery()) {
        // if subquery is not used:
        // rewrite findById(s) from related table to join table
        builder.parentQuery().forEachOperation(FindByIdSelector, op => {
          if (op.name === 'findByIds') {
            builder.whereInComposite(joinTableRelatedRefs, op.ids);
          } else {
            builder.whereComposite(joinTableRelatedRefs, op.id);
          }
        });
      }

      return builder.whereComposite(joinTableOwnerRefs, ownerIds);
    }
  };
};

module.exports = {
  ManyToManyMySqlModifyMixin
};
