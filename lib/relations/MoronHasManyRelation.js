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
  var ownerIds = _.unique(_.pluck(owners, this.ownerModelClass.idProperty));

  return this._makeFindQuery(builder, ownerIds).runAfterModelCreatePushFront(function (related) {
    var relatedByOwnerId = _.groupBy(related, self.ownerJoinColumn);

    _.each(owners, function (owner) {
      owner[self.name] = relatedByOwnerId[owner.$id()] || [];
    });

    return related;
  });
};

MoronHasManyRelation.prototype.insert = function (builder, $owner, $insertion) {
  var self = this;
  var owner = this.ownerModelClass.ensureModel($owner);
  var insertion = this.relatedModelClass.ensureModelArray($insertion);

  _.each(insertion, function (insert) {
    insert[self.ownerJoinColumn] = owner.$id();
  });

  return this.relatedModelClass.$$insert(builder, insertion).runAfterModelCreate(function (models) {
    owner[self.name] = _.compact(_.flatten([owner[self.name], models]));
    return _.isArray($insertion) ? models : models[0];
  });
};

MoronHasManyRelation.prototype.update = function (builder, $owner, $update) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner.$id()]);
  this.relatedModelClass.$$update(builder, $update);

  return builder;
};

MoronHasManyRelation.prototype.patch = function (builder, $owner, $patch) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner.$id()]);
  this.relatedModelClass.$$patch(builder, $patch);

  return builder;
};

MoronHasManyRelation.prototype.delete = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner.$id()]);
  this.relatedModelClass.$$delete(builder);

  return builder;
};

MoronHasManyRelation.prototype.relate = function (builder, $owner, $ids) {
  var ownerJoinColumn = this.relatedModelClass.tableName + '.' + this.ownerJoinColumn;
  var ownerIdColumn = this.relatedModelClass.tableName + '.' + this.relatedModelClass.idProperty;
  var owner = this.ownerModelClass.ensureModel($owner);

  return builder
    .update(ownerJoinColumn, owner.$id())
    .whereIn(ownerIdColumn, _.flatten([$ids]))
    .runAfterPushFront(function () {
      return $ids;
    });
};

MoronHasManyRelation.prototype.unrelate = function (builder, $owner) {
  var ownerJoinColumn = this.relatedModelClass.tableName + '.' + this.ownerJoinColumn;
  var owner = this.ownerModelClass.ensureModel($owner);

  return builder
    .update(ownerJoinColumn, null)
    .where(ownerJoinColumn, owner.$id())
    .runAfterPushFront(function () {
      return {};
    });
};

MoronHasManyRelation.prototype._makeFindQuery = function (builder, ownerIds) {
  var ownerJoinColumn = this.relatedModelClass.tableName + '.' + this.ownerJoinColumn;
  return builder.whereIn(ownerJoinColumn, ownerIds);
};

module.exports = MoronHasManyRelation;
