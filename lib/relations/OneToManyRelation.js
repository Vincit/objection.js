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
 */
OneToManyRelation.prototype.find = function (builder, owners) {
  var self = this;
  var ownerIds = _.unique(_.pluck(owners, this.ownerProp));

  builder.onBuild(function (builder) {
    self.findQuery(builder, ownerIds);
  });

  builder.runAfterModelCreate(function (related) {
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
 */
OneToManyRelation.prototype.insert = function (builder, owner, insertion) {
  var self = this;

  _.each(insertion.models(), function (insert) {
    insert[self.relatedProp] = owner[self.ownerProp];
  });

  builder.onBuild(function (builder) {
    builder.$$insert(insertion);
  });

  builder.runAfterModelCreate(function (related) {
    owner[self.name] = self.mergeModels(owner[self.name], related);
    return related;
  });
};

/**
 * @override
 * @inheritDoc
 */
OneToManyRelation.prototype.update = function (builder, owner, update) {
  var self = this;

  builder.onBuild(function (builder) {
    self.findQuery(builder, owner[self.ownerProp]);
    builder.$$update(update);
  });
};

/**
 * @override
 * @inheritDoc
 */
OneToManyRelation.prototype.patch = function (builder, owner, patch) {
  return this.update(builder, owner, patch);
};

/**
 * @override
 * @inheritDoc
 */
OneToManyRelation.prototype.delete = function (builder, owner) {
  var self = this;

  builder.onBuild(function (builder) {
    self.findQuery(builder, owner[self.ownerProp]);
    builder.$$delete();
  });
};

/**
 * @override
 * @inheritDoc
 */
OneToManyRelation.prototype.relate = function (builder, owner, ids) {
  var self = this;

  builder.onBuild(function (builder) {
    var patch = relatePatch(self, owner[self.ownerProp]);

    // We build the input query, but we never actually execute it. This query is not executed,
    // because it would not invoke the $beforeUpdate and $afterUpdate hooks. We build it so that
    // toSql(), toString() etc. return the correct string.
    builder
      .$$update(patch)
      .whereIn(self.relatedModelClass.getFullIdColumn(), ids);
  });

  // Set a custom executor that executes a patch query.
  builder.setQueryExecutor(function () {
    var patch = relatePatch(self, owner[self.ownerProp]);

    return self.relatedModelClass
      .query()
      .patch(patch)
      .whereIn(self.relatedModelClass.getFullIdColumn(), ids)
      .return({});
  });
};

/**
 * @override
 * @inheritDoc
 */
OneToManyRelation.prototype.unrelate = function (builder, owner) {
  var self = this;

  builder.onBuild(function (builder) {
    var patch = relatePatch(self, null);

    // We build the input query, but we never actually execute it. This query is not executed,
    // because it would not invoke the $beforeUpdate and $afterUpdate hooks. We build it so that
    // toSql(), toString() etc. return the correct string.
    builder
      .$$update(patch)
      .where(self.fullRelatedCol(), owner[self.ownerProp])
      .call(self.filter);
  });

  // Set a custom executor that executes a patch query.
  builder.setQueryExecutor(function (builder) {
    var patch = relatePatch(self, null);

    return self.relatedModelClass
      .query()
      .patch(patch)
      .copyFrom(builder, /where/i)
      .return({});
  });
};

/**
 * @private
 */
function relatePatch(relation, value) {
  var patch = {};
  patch[relation.relatedProp] = value;
  return patch;
}

module.exports = OneToManyRelation;
