import _ from 'lodash';
import Relation from './Relation';
import normalizeIds from '../utils/normalizeIds';

export default class BelongsToOneRelation extends Relation {

  createRelationProp(owners, related) {
    let relatedByOwnerId = _.indexBy(related, related => related.$values(this.relatedProp));

    _.each(owners, owner => {
      let ownerId = owner.$values(this.ownerProp);
      owner[this.name] = relatedByOwnerId[ownerId] || null;
    });
  }

  insert(builder, owner, insertion) {
    if (insertion.models().length > 1) {
      this.throwError('can only insert one model to a BelongsToOneRelation');
    }

    builder.onBuild(builder => {
      builder.$$insert(insertion);
    });

    builder.runAfterModelCreate(inserted => {
      owner[this.name] = inserted[0];
      let patch = {};

      _.each(this.ownerProp, (ownerProp, idx) => {
        let relatedValue = inserted[0][this.relatedProp[idx]];
        owner[ownerProp] = relatedValue;
        patch[ownerProp] = relatedValue;
      });

      return this.ownerModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .whereComposite(this.ownerModelClass.getFullIdColumn(), owner.$id())
        .return(inserted);
    });
  }

  relate(builder, owner, ids) {
    ids = normalizeIds(ids, this.relatedProp, {arrayOutput: true});

    if (ids.length > 1) {
      this.throwError('can only relate one model to a BelongsToOneRelation');
    }

    builder.setQueryExecutor(builder => {
      let patch = {};

      _.each(this.ownerProp, (prop, idx) => {
        patch[prop] = ids[0][idx];
        owner[prop] = ids[0][idx];
      });

      return this.ownerModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .copyFrom(builder, /where/i)
        .whereComposite(this.ownerModelClass.getFullIdColumn(), owner.$id())
        .runAfterModelCreate(_.constant({}));
    });
  }

  unrelate(builder, owner) {
    builder.setQueryExecutor(builder => {
      let patch = {};

      _.each(this.ownerProp, prop => {
        patch[prop] = null;
        owner[prop] = null;
      });

      return this.ownerModelClass
        .query()
        .childQueryOf(builder)
        .patch(patch)
        .copyFrom(builder, /where/i)
        .whereComposite(this.ownerModelClass.getFullIdColumn(), owner.$id())
        .runAfterModelCreate(_.constant({}));
    });
  }
}