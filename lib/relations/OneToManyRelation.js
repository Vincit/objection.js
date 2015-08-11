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

OneToManyRelation.prototype.findQuery = function (builder, id, isColumnRef) {
  if (isColumnRef) {
    var formatter = this.relatedModelClass.formatter();
    builder.whereRaw(formatter.wrap(this.fullRelatedCol()) + ' = ' + formatter.wrap(id));
  } else {
    if (_.isArray(id)) {
      builder.whereIn(this.fullRelatedCol(), id);
    } else {
      builder.where(this.fullRelatedCol(), id);
    }
  }

  return builder.call(this.filter);
};

OneToManyRelation.prototype.find = function (builder, $owners) {
  var self = this;
  var owners = this.ownerModelClass.ensureModelArray($owners);
  var ownerIds = _.unique(_.pluck(owners, this.ownerProp));

  return this.findQuery(builder, ownerIds).runAfterModelCreatePushFront(function (related) {
    var relatedByOwnerId = _.groupBy(related, self.relatedProp);

    _.each(owners, function (owner) {
      owner[self.name] = relatedByOwnerId[owner[self.ownerProp]] || [];
    });

    return related;
  });
};

OneToManyRelation.prototype.join = function (builder, joinMethod) {
  joinMethod = joinMethod || 'join';

  var relatedTable = this.relatedModelClass.tableName;
  var relatedTableAlias = this.relatedTableAlias();

  return builder
    [joinMethod](relatedTable + ' as ' + relatedTableAlias, relatedTableAlias + '.' + this.relatedCol, this.fullOwnerCol())
    .call(this.filter);
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

  this.findQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$update(builder, $update);

  return builder;
};

OneToManyRelation.prototype.patch = function (builder, $owner, $patch) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this.findQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$patch(builder, $patch);

  return builder;
};

OneToManyRelation.prototype.delete = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this.findQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$delete(builder);

  return builder;
};

OneToManyRelation.prototype.relate = function (builder, $owner, $ids) {
  var owner = this.ownerModelClass.ensureModel($owner);

  var patch = {};
  patch[this.relatedProp] = owner[this.ownerProp];

  return this.relatedModelClass
    .$$patch(builder, patch)
    .whereIn(this.relatedModelClass.getFullIdColumn(), _.flatten([$ids]))
    .runAfter(function () {
      return $ids;
    });
};

OneToManyRelation.prototype.unrelate = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  var patch = {};
  patch[this.relatedProp] = null;

  return this.relatedModelClass
    .$$patch(builder, patch)
    .where(this.fullRelatedCol(), owner[this.ownerProp])
    .call(this.filter)
    .runAfter(function () {
      return {};
    });
};

module.exports = OneToManyRelation;
