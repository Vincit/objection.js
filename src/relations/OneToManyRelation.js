import _ from 'lodash';
import Relation from './Relation';

/**
 * @ignore
 * @extends Relation
 */
export default class OneToManyRelation extends Relation {
  /**
   * @override
   * @inheritDoc
   */
  find(builder, owners) {
    builder.onBuild(builder => {
      let ids = _(owners)
        .map(owner => owner.$values(this.ownerProp))
        .unique(id => id.join())
        .value();

      this.findQuery(builder, ids);
    });

    builder.runAfterModelCreate(related => {
      var relatedByOwnerId = _.groupBy(related, related => related.$values(this.relatedProp));

      _.each(owners, owner => {
        let ownerId = owner.$values(this.ownerProp);
        owner[this.name] = relatedByOwnerId[ownerId] || [];
      });

      return related;
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  insert(builder, owner, insertion) {
    _.each(insertion.models(), insert => {
      _.each(this.relatedProp, (relatedProp, idx) => {
        insert[relatedProp] = owner[this.ownerProp[idx]];
      });
    });

    builder.onBuild(builder => {
      builder.$$insert(insertion);
    });

    builder.runAfterModelCreate(related => {
      owner[this.name] = this.mergeModels(owner[this.name], related);
      return related;
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  relate(builder, owner, ids) {
    ids = this.normalizeId(ids, this.relatedModelClass.getIdColumnDimension());

    builder.setQueryExecutor(builder => {
      var patch = {};

      _.each(this.relatedProp, (relatedProp, idx) => {
        patch[relatedProp] = owner[this.ownerProp[idx]];
      });

      return this.relatedModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .copyFrom(builder, /where/i)
        .whereInComposite(this.relatedModelClass.getFullIdColumn(), ids)
        .call(this.filter)
        .runAfter(_.constant({}));
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  unrelate(builder, owner) {
    builder.setQueryExecutor(builder => {
      var patch = {};

      _.each(this.relatedProp, relatedProp => {
        patch[relatedProp] = null;
      });

      return this.relatedModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .copyFrom(builder, /where/i)
        .whereComposite(this.fullRelatedCol(), owner.$values(this.ownerProp))
        .call(this.filter)
        .runAfter(_.constant({}));
    });
  }
}
