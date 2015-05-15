"use strict";

var _ = require('lodash')
  , MoronRelation = require('./MoronRelation');

/**
 * @constructor
 * @extends MoronRelation
 */
function MoronHasOneRelation() {
  MoronRelation.apply(this, arguments);
}

MoronRelation.makeSubclass(MoronHasOneRelation);

MoronHasOneRelation.prototype.find = function (builder, $owners) {
  var owners = this.ownerModelClass.ensureModelArray($owners);
  var ownersById = _.indexBy(owners, 'id');
  var relationName = this.name;
  var relatedJoinColumn = this.relatedJoinColumn;

  return this._makeFindQuery(builder, ownersById).runAfterPushFront(function (related) {
    var relatedById = _.groupBy(related, 'id');

    _.each(owners, function (owner) {
      owner[relationName] = relatedById[owner[relatedJoinColumn]] || null;
    });

    return related;
  });
};

MoronHasOneRelation.prototype.insert = function (builder, $owner, $insertion) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var insertion = this.relatedModelClass.ensureModelArray($insertion);
  var relatedJoinColumn = this.relatedJoinColumn;

  if (insertion.length > 1) {
    throw new Error('can only insert one model to a MoronHasOneRelation');
  }

  return this.relatedModelClass.$$insert(builder, $insertion).runAfterPushFront(function (inserted) {
    owner[relatedJoinColumn] = inserted[0].id;
    return owner
      .$query(builder.transaction())
      .update()
      .return(inserted[0]);
  });
};

MoronHasOneRelation.prototype.update = function (builder, $owner, $update) {
  var owners = this.ownerModelClass.ensureModelArray($owner);
  var ownersById = _.indexBy(owners, 'id');

  this._makeFindQuery(builder, ownersById);
  this.relatedModelClass.$$update(builder, $update);

  return builder;
};

MoronHasOneRelation.prototype.patch = function (builder, $owner, $patch) {
  var owners = this.ownerModelClass.ensureModelArray($owner);
  var ownersById = _.indexBy(owners, 'id');

  this._makeFindQuery(builder, ownersById);
  this.relatedModelClass.$$patch(builder, $patch);

  return builder;
};

MoronHasOneRelation.prototype.delete = function (builder, $owner) {
  var owners = this.ownerModelClass.ensureModelArray($owner);
  var ownersById = _.indexBy(owners, 'id');

  this._makeFindQuery(builder, ownersById);
  this.relatedModelClass.$$delete(builder);

  return builder;
};

MoronHasOneRelation.prototype.relate = function (builder, $owner, $ids) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var ids = _.flatten([$ids]);

  if (ids.length > 1) {
    throw new Error('can only relate one model to a MoronHasOneRelation');
  }

  return builder
    .from(this.ownerModelClass.tableName)
    .update(this.relatedJoinColumn, ids[0])
    .where('id', owner.id)
    .runAfterModelCreatePushFront(function () {
      return ids[0];
    });
};

MoronHasOneRelation.prototype.unrelate = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  return builder
    .from(this.ownerModelClass.tableName)
    .update(this.relatedJoinColumn, null)
    .where('id', owner.id)
    .runAfterModelCreatePushFront(function () {
      return {};
    });
};

MoronHasOneRelation.prototype._makeFindQuery = function (builder, ownersById) {
  return builder.whereIn('id', _.pluck(_.values(ownersById), this.relatedJoinColumn));
};

module.exports = MoronHasOneRelation;
