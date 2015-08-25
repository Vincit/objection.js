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

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToManyRelation.prototype.findQuery = function (builder, ownerCol, isColumnRef) {
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
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToManyRelation.prototype.find = function (builder, $owners) {
  var self = this;
  var owners = this.ownerModelClass.ensureModelArray($owners);
  var ownerIds = _.unique(_.pluck(owners, this.ownerProp));

  return this.findQuery(builder, ownerIds).runAfterModelCreate(function (related) {
    var relatedByOwnerId = _.groupBy(related, self.relatedProp);

    _.each(owners, function (owner) {
      owner[self.name] = relatedByOwnerId[owner[self.ownerProp]] || [];
    });

    return related;
  });
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToManyRelation.prototype.join = function (builder, joinMethod) {
  joinMethod = joinMethod || 'join';

  var relatedTable = this.relatedModelClass.tableName;
  var relatedTableAlias = this.relatedTableAlias();

  return builder
    [joinMethod](relatedTable + ' as ' + relatedTableAlias, relatedTableAlias + '.' + this.relatedCol, this.fullOwnerCol())
    .call(this.filter);
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
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

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToManyRelation.prototype.update = function (builder, $owner, $update) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this.findQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$update(builder, $update);

  return builder;
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToManyRelation.prototype.patch = function (builder, $owner, $patch) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this.findQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$patch(builder, $patch);

  return builder;
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToManyRelation.prototype.delete = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this.findQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$delete(builder);

  return builder;
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToManyRelation.prototype.relate = function (builder, $owner, $ids) {
  var owner = this.ownerModelClass.ensureModel($owner);

  var patch = {};
  patch[this.relatedProp] = owner[this.ownerProp];

  return this.relatedModelClass
    .$$patch(builder, patch)
    .whereIn(this.relatedModelClass.getFullIdColumn(), _.flatten([$ids]))
    .runAfterModelCreate(function () {
      return $ids;
    });
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToManyRelation.prototype.unrelate = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  var patch = {};
  patch[this.relatedProp] = null;

  return this.relatedModelClass
    .$$patch(builder, patch)
    .where(this.fullRelatedCol(), owner[this.ownerProp])
    .call(this.filter)
    .runAfterModelCreate(function () {
      return {};
    });
};

module.exports = OneToManyRelation;
