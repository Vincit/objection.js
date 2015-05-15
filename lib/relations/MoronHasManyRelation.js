"use strict";

var _ = require('lodash')
  , MoronRelation = require('./MoronRelation');

/**
 * @constructor
 * @extends MoronRelation
 */
function MoronHasManyRelation() {
  MoronRelation.apply(this, arguments);
}

MoronRelation.makeSubclass(MoronHasManyRelation);

MoronHasManyRelation.prototype.find = function (builder, $owners) {
  var self = this;
  var owners = this.ownerModelClass.ensureModelArray($owners);
  var ownersById = _.indexBy(owners, this.ownerModelClass.idProperty);

  return this._makeFindQuery(builder, ownersById).runAfterModelCreatePushFront(function (related) {
    var relatedByOwnerId = _.groupBy(related, self.ownerJoinColumn);

    _.each(owners, function (owner) {
      owner[self.name] = relatedByOwnerId[owner.$id()] || [];
    });

    return related;
  });
};

MoronHasManyRelation.prototype.insert = function (builder, $owner, $insertion) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var insertion = this.relatedModelClass.ensureModelArray($insertion);
  var ownerJoinColumn = this.ownerJoinColumn;

  _.each(insertion, function (insert) {
    insert[ownerJoinColumn] = owner.id;
  });

  return this.relatedModelClass.$$insert(builder, $insertion);
};

MoronHasManyRelation.prototype.update = function (builder, $owner, $update) {
  var owners = this.ownerModelClass.ensureModelArray($owner);
  var ownersById = _.indexBy(owners, 'id');

  this._makeFindQuery(builder, ownersById);
  this.relatedModelClass.$$update(builder, $update);

  return builder;
};

MoronHasManyRelation.prototype.patch = function (builder, $owner, $patch) {
  var owners = this.ownerModelClass.ensureModelArray($owner);
  var ownersById = _.indexBy(owners, 'id');

  this._makeFindQuery(builder, ownersById);
  this.relatedModelClass.$$patch(builder, $patch);

  return builder;
};

MoronHasManyRelation.prototype.delete = function (builder, $owner) {
  var owners = this.ownerModelClass.ensureModelArray($owner);
  var ownersById = _.indexBy(owners, 'id');

  this._makeFindQuery(builder, ownersById);
  this.relatedModelClass.$$delete(builder);

  return builder;
};

MoronHasManyRelation.prototype.relate = function (builder, $owner, $ids) {
  var owner = this.ownerModelClass.ensureModel($owner);

  return builder
    .update(this.ownerJoinColumn, owner.$id())
    .whereIn('id', _.flatten([$ids]))
    .runAfterPushFront(function () {
      return ids;
    });
};

MoronHasManyRelation.prototype.unrelate = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  return builder
    .update(this.ownerJoinColumn, null)
    .where(this.ownerJoinColumn, owner.$id())
    .runAfterPushFront(function () {
      return {};
    });
};

MoronHasManyRelation.prototype._makeFindQuery = function (builder, ownersById) {
  return builder.whereIn(this.ownerJoinColumn, _.keys(ownersById));
};

module.exports = MoronHasManyRelation;
