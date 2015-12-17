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
      builder.whereIn(this.fullRelatedCol(), _.compact(ownerCol));
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
OneToOneRelation.prototype.join = function (builder, joinMethod) {
  joinMethod = joinMethod || 'join';

  var relatedTable = this.relatedModelClass.tableName;
  var relatedTableAlias = this.relatedTableAlias();

  var relatedTableAsAlias = relatedTable + ' as ' + relatedTableAlias;
  var relatedCol = relatedTableAlias + '.' + this.relatedCol;

  return builder
    [joinMethod](relatedTableAsAlias, relatedCol, this.fullOwnerCol())
    .call(this.filter);
};

/**
 * @override
 * @inheritDoc
 */
OneToOneRelation.prototype.find = function (builder, owners) {
  var self = this;

  builder.onBuild(function (builder) {
    var relatedIds = _.unique(_.compact(_.pluck(owners, self.ownerProp)));
    self._makeFindQuery(builder, relatedIds);
  });

  builder.runAfterModelCreate(function (related) {
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
 */
OneToOneRelation.prototype.insert = function (builder, owner, insertion) {
  var self = this;

  if (insertion.models().length > 1) {
    throw new Error('can only insert one model to a OneToOneRelation');
  }

  builder.onBuild(function (builder) {
    builder.$$insert(insertion);
  });

  builder.runAfterModelCreate(function (inserted) {
    owner[self.ownerProp] = inserted[0][self.relatedProp];
    owner[self.name] = inserted[0];

    var patch = {};
    patch[self.ownerProp] = inserted[0][self.relatedProp];

    return self.ownerModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .where(self.ownerModelClass.getFullIdColumn(), owner.$id())
      .return(inserted);
  });
};

/**
 * @override
 * @inheritDoc
 */
OneToOneRelation.prototype.update = function (builder, owner, update) {
  var self = this;

  builder.onBuild(function (builder) {
    self._makeFindQuery(builder, owner[self.ownerProp]);
    builder.$$update(update);
  });
};

/**
 * @override
 * @inheritDoc
 */
OneToOneRelation.prototype.patch = function (builder, owner, patch) {
  return this.update(builder, owner, patch);
};

/**
 * @override
 * @inheritDoc
 */
OneToOneRelation.prototype.delete = function (builder, owner) {
  var self = this;

  builder.onBuild(function (builder) {
    self._makeFindQuery(builder, owner[self.ownerProp]);
    builder.$$delete();
  });
};

/**
 * @override
 * @inheritDoc
 */
OneToOneRelation.prototype.relate = function (builder, owner, ids) {
  var self = this;

  if (ids.length > 1) {
    throw new Error('can only relate one model to a OneToOneRelation');
  }

  // Set a custom executor that executes a patch query.
  builder.setQueryExecutor(function (builder) {
    var patch = {};

    patch[self.ownerProp] = ids[0];
    owner[self.ownerProp] = ids[0];

    return self.ownerModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, /where/i)
      .where(self.ownerModelClass.getFullIdColumn(), owner.$id())
      .runAfterModelCreate(_.constant({}));
  });
};

/**
 * @override
 * @inheritDoc
 */
OneToOneRelation.prototype.unrelate = function (builder, owner) {
  var self = this;

  // Set a custom executor that executes a patch query.
  builder.setQueryExecutor(function (builder) {
    var patch = {};

    patch[self.ownerProp] = null;
    owner[self.ownerProp] = null;

    return self.ownerModelClass
      .query()
      .childQueryOf(builder)
      .patch(patch)
      .copyFrom(builder, /where/i)
      .where(self.ownerModelClass.getFullIdColumn(), owner.$id())
      .runAfterModelCreate(_.constant({}));
  });
};

/**
 * @private
 */
OneToOneRelation.prototype._makeFindQuery = function (builder, relatedIds) {
  if ((_.isArray(relatedIds) && _.isEmpty(relatedIds)) || !relatedIds) {
    return builder.resolve([]);
  } else {
    return this.findQuery(builder, relatedIds);
  }
};

module.exports = OneToOneRelation;
