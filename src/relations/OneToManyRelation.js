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
   * @returns {QueryBuilder}
   */
  findQuery(builder, ownerCol, isColumnRef) {
    if (isColumnRef) {
      builder.whereRef(this.fullRelatedCol(), ownerCol);
    } else {
      if (_.isArray(ownerCol)) {
        builder.whereIn(this.fullRelatedCol(), ownerCol);
      } else {
        builder.where(this.fullRelatedCol(), ownerCol);
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
  };

  /**
   * @override
   * @inheritDoc
   */
  find(builder, owners) {
    let ownerIds = _.unique(_.pluck(owners, this.ownerProp));

    builder.onBuild(builder => {
      this.findQuery(builder, ownerIds);
    });

    builder.runAfterModelCreate(related => {
      var relatedByOwnerId = _.groupBy(related, this.relatedProp);

      _.each(owners, owner => {
        owner[this.name] = relatedByOwnerId[owner[this.ownerProp]] || [];
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
      insert[this.relatedProp] = owner[this.ownerProp];
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
  update(builder, owner, update) {
    builder.onBuild(builder => {
      this.findQuery(builder, owner[this.ownerProp]);
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
      this.findQuery(builder, owner[this.ownerProp]);
      builder.$$delete();
    });
  }

  /**
   * @override
   * @inheritDoc
   */
  relate(builder, owner, ids) {
    builder.setQueryExecutor(() => {
      var patch = relatePatch(this, owner[this.ownerProp]);

      return this.relatedModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .copyFrom(builder, /where/i)
        .whereIn(this.relatedModelClass.getFullIdColumn(), ids)
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
      var patch = relatePatch(this, null);

      return this.relatedModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .copyFrom(builder, /where/i)
        .where(this.fullRelatedCol(), owner[this.ownerProp])
        .call(this.filter)
        .runAfter(_.constant({}));
    });
  }
}

/**
 * @private
 */
function relatePatch(relation, value) {
  var patch = {};
  patch[relation.relatedProp] = value;
  return patch;
}
