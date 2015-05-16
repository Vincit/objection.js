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
  var self = this;
  var owners = this.ownerModelClass.ensureModelArray($owners);
  var relatedIds = _.unique(_.compact(_.pluck(owners, this.relatedJoinColumn)));

  return this._makeFindQuery(builder, relatedIds).runAfterModelCreate(function (related) {
    var relatedById = _.indexBy(related, self.relatedModelClass.idProperty);

    _.each(owners, function (owner) {
      owner[self.name] = relatedById[owner[self.relatedJoinColumn]] || null;
    });

    return related;
  });
};

MoronHasOneRelation.prototype.insert = function (builder, $owner, $insertion) {
  var self = this;
  var owner = this.ownerModelClass.ensureModel($owner);
  var insertion = this.relatedModelClass.ensureModelArray($insertion);

  if (insertion.length > 1) {
    throw new Error('can only insert one model to a MoronHasOneRelation');
  }

  return this.relatedModelClass.$$insert(builder, insertion).runAfterModelCreate(function (inserted) {
    owner[self.relatedJoinColumn] = inserted[0].$id();
    owner[self.name] = inserted[0];

    return self.ownerModelClass
      .knexQuery(builder.transaction())
      .where('id', owner.$id())
      .update(self.relatedJoinColumn, inserted[0].$id())
      .return(_.isArray($insertion) ? inserted : inserted[0]);
  });
};

MoronHasOneRelation.prototype.update = function (builder, $owner, $update) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.relatedJoinColumn]]);
  this.relatedModelClass.$$update(builder, $update);

  return builder;
};

MoronHasOneRelation.prototype.patch = function (builder, $owner, $patch) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.relatedJoinColumn]]);
  this.relatedModelClass.$$patch(builder, $patch);

  return builder;
};

MoronHasOneRelation.prototype.delete = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.relatedJoinColumn]]);
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
    .where(this.ownerModelClass.idProperty, owner.id)
    .runAfterModelCreatePushFront(function () {
      return $ids;
    });
};

MoronHasOneRelation.prototype.unrelate = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  return builder
    .from(this.ownerModelClass.tableName)
    .update(this.relatedJoinColumn, null)
    .where(this.ownerModelClass.idProperty, owner.id)
    .runAfterModelCreatePushFront(function () {
      return {};
    });
};

MoronHasOneRelation.prototype._makeFindQuery = function (builder, relatedIds) {
  relatedIds = _.compact(relatedIds);

  if (_.isEmpty(relatedIds)) {
    return builder.resolve([]);
  } else {
    return builder.whereIn(this.relatedModelClass.idProperty, relatedIds);
  }
};

module.exports = MoronHasOneRelation;
