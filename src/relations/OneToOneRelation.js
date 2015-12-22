import _ from 'lodash';
import Relation from './Relation';

/**
 * @ignore
 * @extends Relation
 */
export default class OneToOneRelation extends Relation {
  /**
   * @override
   * @inheritDoc
   * @returns {QueryBuilder}
   */
  findQuery(builder, ownerCol, isColumnRef) {
    if (isColumnRef) {
      builder.whereRef(this.fullRelatedCol(), ownerCol);
    } else {
      if (_.isArray(ownerCol)) {
        builder.whereIn(this.fullRelatedCol(), _.compact(ownerCol));
      } else {
        builder.where(this.fullRelatedCol(), ownerCol)
      }
    }

    return builder.call(this.filter);
  }

  /**
   * @override
   * @inheritDoc
   * @returns {QueryBuilder}
   */
  join(builder, joinMethod) {
    joinMethod = joinMethod || 'join';

    let relatedTable = this.relatedModelClass.tableName;
    let relatedTableAlias = this.relatedTableAlias();

    let relatedTableAsAlias = relatedTable + ' as ' + relatedTableAlias;
    let relatedCol = relatedTableAlias + '.' + this.relatedCol;

    return builder
      [joinMethod](relatedTableAsAlias, relatedCol, this.fullOwnerCol())
      .call(this.filter);
  }

  /**
   * @override
   * @inheritDoc
   */
  find(builder, owners) {
    builder.onBuild(builder => {
      let relatedIds = _.unique(_.compact(_.pluck(owners, this.ownerProp)));
      this._makeFindQuery(builder, relatedIds);
    });

    builder.runAfterModelCreate(related => {
      let relatedById = _.indexBy(related, this.relatedProp);

      _.each(owners, owner => {
        owner[this.name] = relatedById[owner[this.ownerProp]] || null;
      });

      return related;
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  insert(builder, owner, insertion) {
    if (insertion.models().length > 1) {
      throw new Error('can only insert one model to a OneToOneRelation');
    }

    builder.onBuild(builder => {
      builder.$$insert(insertion);
    });

    builder.runAfterModelCreate(inserted => {
      owner[this.ownerProp] = inserted[0][this.relatedProp];
      owner[this.name] = inserted[0];

      let patch = {};
      patch[this.ownerProp] = inserted[0][this.relatedProp];

      return this.ownerModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .where(this.ownerModelClass.getFullIdColumn(), owner.$id())
        .return(inserted);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  update(builder, owner, update) {
    builder.onBuild(builder => {
      this._makeFindQuery(builder, owner[this.ownerProp]);
      builder.$$update(update);
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  patch(builder, owner, patch) {
    return this.update(builder, owner, patch);
  }

  /**
   * @override
   * @inheritDoc
   */
  delete(builder, owner) {
    builder.onBuild(builder => {
      this._makeFindQuery(builder, owner[this.ownerProp]);
      builder.$$delete();
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  relate(builder, owner, ids) {
    if (ids.length > 1) {
      throw new Error('can only relate one model to a OneToOneRelation');
    }

    builder.setQueryExecutor(builder => {
      let patch = {};

      patch[this.ownerProp] = ids[0];
      owner[this.ownerProp] = ids[0];

      return this.ownerModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .copyFrom(builder, /where/i)
        .where(this.ownerModelClass.getFullIdColumn(), owner.$id())
        .runAfterModelCreate(_.constant({}));
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  unrelate(builder, owner) {
    builder.setQueryExecutor(builder => {
      let patch = {};

      patch[this.ownerProp] = null;
      owner[this.ownerProp] = null;

      return this.ownerModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .copyFrom(builder, /where/i)
        .where(this.ownerModelClass.getFullIdColumn(), owner.$id())
        .runAfterModelCreate(_.constant({}));
    });
  }

  /**
   * @private
   */
  _makeFindQuery(builder, relatedIds) {
    if ((_.isArray(relatedIds) && _.isEmpty(relatedIds)) || !relatedIds) {
      return builder.resolve([]);
    } else {
      return this.findQuery(builder, relatedIds);
    }
  }
}


