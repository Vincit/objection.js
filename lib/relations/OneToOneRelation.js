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

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToOneRelation.prototype.findQuery = function (builder, ownerCol, isColumnRef) {
  if (isColumnRef) {
    builder.whereRef(this.fullRelatedCol(), ownerCol);
  } else {
    if (_.isArray(ownerCol)) {
      builder.whereIn(this.fullRelatedCol(), ownerCol);
    } else {
      builder.where(this.fullRelatedCol(), ownerCol)
    }
  }

  return builder.call(this.filter);
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
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

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToOneRelation.prototype.join = function (builder, joinMethod) {
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

    var patch = {};
    patch[self.ownerProp] = inserted[0][self.relatedProp];
    owner[self.ownerProp] = inserted[0][self.relatedProp];

    return self.ownerModelClass
      .query()
      .patch(patch)
      .where(self.ownerModelClass.getFullIdColumn(), owner.$id())
      .then(function () {
        return _.isArray($insertion) ? inserted : inserted[0];
      });
  });
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToOneRelation.prototype.update = function (builder, $owner, $update) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$update(builder, $update);

  return builder;
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToOneRelation.prototype.patch = function (builder, $owner, $patch) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$patch(builder, $patch);

  return builder;
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToOneRelation.prototype.delete = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  this._makeFindQuery(builder, [owner[this.ownerProp]]);
  this.relatedModelClass.$$delete(builder);

  return builder;
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToOneRelation.prototype.relate = function (builder, $owner, $ids) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var ids = _.flatten([$ids]);

  if (ids.length > 1) {
    throw new Error('can only relate one model to a OneToOneRelation');
  }

  var patch = {};
  patch[this.ownerProp] = ids[0];
  owner[this.ownerProp] = ids[0];

  return this.ownerModelClass
    .$$patch(builder, patch)
    .from(this.ownerModelClass.tableName)
    .where(this.ownerModelClass.getFullIdColumn(), owner.$id())
    .runAfterModelCreate(function () {
      return $ids;
    });
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
OneToOneRelation.prototype.unrelate = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);

  var patch = {};
  patch[this.ownerProp] = null;
  owner[this.ownerProp] = null;

  return this.ownerModelClass
    .$$patch(builder, patch)
    .from(this.ownerModelClass.tableName)
    .where(this.ownerModelClass.getFullIdColumn(), owner.$id())
    .runAfterModelCreate(function () {
      return {};
    });
};

/**
 * @private
 */
OneToOneRelation.prototype._makeFindQuery = function (builder, relatedIds) {
  relatedIds = _.compact(relatedIds);

  if (_.isEmpty(relatedIds)) {
    return builder.resolve([]);
  } else {
    return this.findQuery(builder, relatedIds);
  }
};

module.exports = OneToOneRelation;
