'use strict';

var _ = require('lodash')
  , Relation = require('./Relation');

/**
 * @constructor
 * @ignore
 * @extends Relation
 */
function OneToManyRelation() {
  Relation.apply(this, arguments);
}

Relation.extend(OneToManyRelation);

OneToManyRelation.prototype.find = function (builder, $owners) {
  var self = this;
  var owners = this.ownerModelClass.ensureModelArray($owners);
  var ownerIds = _.unique(_.pluck(owners, this.ownerProp));

  return this._makeFindQuery(builder, ownerIds).runAfterModelCreatePushFront(function (related) {
    var relatedByOwnerId = _.groupBy(related, self.relatedProp);

    _.each(owners, function (owner) {
      owner[self.name] = relatedByOwnerId[owner[self.ownerProp]] || [];
    });

    return related;
  });
};

OneToManyRelation.prototype.insert = function (builder, $owner, $insertion) {
  var self = this;
  var owner = this.ownerModelClass.ensureModel($owner);
  var insertion = this.relatedModelClass.ensureModelArray($insertion);

  _.each(insertion, function (insert) {
    insert[self.relatedProp] = owner[self.ownerProp];
  });

  return this.relatedModelClass.$$insert(builder, insertion).runAfterModelCreate(function (models) {
    owner[self.name] = _.compact(_.flatten([owner[self.name], models]));
    return _.isArray($insertion) ? models : models[0];
  });
};

OneToManyRelation.prototype.update = function (builder, $owner, $update) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$update(builder, $update);

  return builder;
};

OneToManyRelation.prototype.patch = function (builder, $owner, $patch) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$patch(builder, $patch);

  return builder;
};

OneToManyRelation.prototype.delete = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$delete(builder);

  return builder;
};

OneToManyRelation.prototype.relate = function (builder, $owner, $ids) {
  var owner = this.ownerModelClass.ensureModel($owner);

  return builder
    .update(this.relatedCol, owner[this.ownerProp])
    .whereIn(this.relatedModelClass.getFullIdColumn(), _.flatten([$ids]))
    .runAfterPushFront(function () {
      return $ids;
    });
};

OneToManyRelation.prototype.unrelate = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  return builder
    .update(this.relatedCol, null)
    .where(this.fullRelatedCol(), owner[this.ownerProp])
    .runAfterPushFront(function () {
      return {};
    });
};

OneToManyRelation.prototype._makeFindQuery = function (builder, ownerIds) {
  return builder.whereIn(this.fullRelatedCol(), _.compact(ownerIds));
};

module.exports = OneToManyRelation;
