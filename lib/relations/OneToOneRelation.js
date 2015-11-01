'use strict';

var _ = require('lodash')
  , Promise = require('bluebird')
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

  return builder
    [joinMethod](relatedTable + ' as ' + relatedTableAlias, relatedTableAlias + '.' + this.relatedCol, this.fullOwnerCol())
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
 * Person
 *  .query()
 *  .update({
 *    age: Person.query().avg('age'),
 *
 *  })
 */

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

  builder.onBuild(function (builder) {
    var patch = {};
    patch[self.ownerProp] = ids[0];
    owner[self.ownerProp] = ids[0];

    // We build the input query, but we never actually execute it. Instead we resolve it here.
    // This query is not executed, because it would not invoke the $beforeUpdate and $afterUpdate
    // hooks. We build it so that toSql(), toString() etc. return the correct string.
    builder
      .$$update(patch)
      .from(self.ownerModelClass.tableName)
      .where(self.ownerModelClass.getFullIdColumn(), owner.$id())
      .call(self.filter)
      .resolve({});
  });

  builder.runAfterModelCreatePushFront(function (input) {
    var builder = this;
    var patch = {};
    patch[self.ownerProp] = ids[0];

    // Here we execute the actual update query.
    return self.ownerModelClass
      .query()
      .patch(patch)
      .copyFrom(builder.cloneWhereQuery())
      .return(input);
  });
};

/**
 * @override
 * @inheritDoc
 */
OneToOneRelation.prototype.unrelate = function (builder, owner) {
  var self = this;

  builder.onBuild(function (builder) {
    var patch = {};
    patch[self.ownerProp] = null;
    owner[self.ownerProp] = null;

    // We build the input query, but we never actually execute it. Instead we resolve it here.
    // This query is not executed, because it would not invoke the $beforeUpdate and $afterUpdate
    // hooks. We build it so that toSql(), toString() etc. return the correct string.
    builder
      .$$update(patch)
      .from(self.ownerModelClass.tableName)
      .where(self.ownerModelClass.getFullIdColumn(), owner.$id())
      .call(self.filter)
      .resolve({});
  });

  builder.runAfterModelCreatePushFront(function (input) {
    var builder = this;
    var patch = {};
    patch[self.ownerProp] = null;

    // Here we execute the actual update query.
    return self.ownerModelClass
      .query()
      .patch(patch)
      .copyFrom(builder.cloneWhereQuery())
      .return(input);
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
