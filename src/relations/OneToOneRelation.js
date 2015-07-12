'use strict';

var _ = require('lodash')
  , Relation = require('./Relation');

/**
 * @constructor
 * @ignore
 * @extends Relation
 */
function OneToOneRelation() {
  Relation.apply(this, arguments);
}

Relation.extend(OneToOneRelation);

OneToOneRelation.prototype.find = function (builder, $owners) {
  var self = this;
  var owners = this.ownerModelClass.ensureModelArray($owners);
  var relatedIds = _.unique(_.compact(_.pluck(owners, this.ownerProp)));

  return this._makeFindQuery(builder, relatedIds).runAfterModelCreate(function (related) {
    var relatedById = _.indexBy(related, self.relatedProp);

    _.each(owners, function (owner) {
      owner[self.name] = relatedById[owner[self.ownerProp]] || null;
    });

    return related;
  });
};

OneToOneRelation.prototype.insert = function (builder, $owner, $insertion) {
  var self = this;
  var owner = this.ownerModelClass.ensureModel($owner);
  var insertion = this.relatedModelClass.ensureModelArray($insertion);

  if (insertion.length > 1) {
    throw new Error('can only insert one model to a OneToOneRelation');
  }

  return this.relatedModelClass.$$insert(builder, insertion).runAfterModelCreate(function (inserted) {
    owner[self.ownerProp] = inserted[0][self.relatedProp];
    owner[self.name] = inserted[0];

    return self.ownerModelClass
      .knexQuery()
      .where(self.ownerModelClass.getFullIdColumn(), owner.$id())
      .update(self.ownerCol, inserted[0][self.relatedProp])
      .then(function () {
        return _.isArray($insertion) ? inserted : inserted[0];
      });
  });
};

OneToOneRelation.prototype.update = function (builder, $owner, $update) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$update(builder, $update);

  return builder;
};

OneToOneRelation.prototype.patch = function (builder, $owner, $patch) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$patch(builder, $patch);

  return builder;
};

OneToOneRelation.prototype.delete = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$delete(builder);

  return builder;
};

OneToOneRelation.prototype.relate = function (builder, $owner, $ids) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var ids = _.flatten([$ids]);

  if (ids.length > 1) {
    throw new Error('can only relate one model to a OneToOneRelation');
  }

  return builder
    .from(this.ownerModelClass.tableName)
    .update(this.ownerCol, ids[0])
    .where(this.ownerModelClass.getFullIdColumn(), owner.$id())
    .runAfterModelCreatePushFront(function () {
      return $ids;
    });
};

OneToOneRelation.prototype.unrelate = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  return builder
    .from(this.ownerModelClass.tableName)
    .update(this.ownerCol, null)
    .where(this.ownerModelClass.getFullIdColumn(), owner.$id())
    .runAfterModelCreatePushFront(function () {
      return {};
    });
};

OneToOneRelation.prototype._makeFindQuery = function (builder, relatedIds) {
  relatedIds = _.compact(relatedIds);

  if (_.isEmpty(relatedIds)) {
    return builder.resolve([]);
  } else {
    return builder.whereIn(this.fullRelatedCol(), relatedIds).call(this.filter);
  }
};

module.exports = OneToOneRelation;
