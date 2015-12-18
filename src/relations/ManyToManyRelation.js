'use strict';

var _ = require('lodash')
  , Relation = require('./Relation')
  , inheritModel = require('../model/inheritModel')
  , ownerJoinColumnAlias = 'objectiontmpjoin';

/**
 * @constructor
 * @ignore
 * @extends Relation
 */
function ManyToManyRelation() {
  Relation.apply(this, arguments);

  /**
   * The join table.
   *
   * @type {String}
   */
  this.joinTable = null;

  /**
   * The relation column in the join table that points to the owner table.
   *
   * @type {String}
   */
  this.joinTableOwnerCol = null;

  /**
   * The relation property in the join model that points to the owner table.
   *
   * @type {String}
   */
  this.joinTableOwnerProp = null;

  /**
   * The relation column in the join table that points to the related table.
   *
   * @type {String}
   */
  this.joinTableRelatedCol = null;

  /**
   * The relation property in the join model that points to the related table.
   *
   * @type {String}
   */
  this.joinTableRelatedProp = null;

  /**
   * The join table model class.
   *
   * This can be optionally given using the `join.through.modelClass` property,
   * otherwise an anonymous model class is created in `setMapping` method.
   */
  this.joinTableModelClass = null;
}

Relation.extend(ManyToManyRelation);

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.setMapping = function (mapping) {
  // Avoid require loop and import here.
  var Model = require(__dirname + '/../model/Model').default;

  var retVal = Relation.prototype.setMapping.call(this, mapping);
  var errorPrefix = this.ownerModelClass.name + '.relationMappings.' + this.name;

  if (!_.isObject(mapping.join.through)) {
    throw new Error(errorPrefix + '.join must have the `through` that describes the join table.');
  }

  if (!_.isString(mapping.join.through.from) || !_.isString(mapping.join.through.to)) {
    throw new Error(errorPrefix + '.join.through must be an object that describes the join table. For example: {from: \'JoinTable.someId\', to: \'JoinTable.someOtherId\'}');
  }

  var joinFrom = Relation.parseColumn(mapping.join.from);
  var joinTableFrom = Relation.parseColumn(mapping.join.through.from);
  var joinTableTo = Relation.parseColumn(mapping.join.through.to);

  if (!joinTableFrom.table || !joinTableFrom.name) {
    throw new Error(errorPrefix + '.join.through.from must have format JoinTable.columnName. For example `JoinTable.someId`.');
  }

  if (!joinTableTo.table || !joinTableTo.name) {
    throw new Error(errorPrefix + '.join.through.to must have format JoinTable.columnName. For example `JoinTable.someId`.');
  }

  if (joinTableFrom.table !== joinTableTo.table) {
    throw new Error(errorPrefix + '.join.through `from` and `to` must point to the same join table.');
  }

  this.joinTable = joinTableFrom.table;

  if (joinFrom.table === this.ownerModelClass.tableName) {
    this.joinTableOwnerCol = joinTableFrom.name;
    this.joinTableRelatedCol = joinTableTo.name;
  } else {
    this.joinTableRelatedCol = joinTableFrom.name;
    this.joinTableOwnerCol = joinTableTo.name;
  }

  if (mapping.join.through.modelClass) {
    if (!utils.isSubclassOf(mapping.join.through.modelClass, Model)) {
      throw new Error('Join table model class is not a subclass of Model');
    }

    this.joinTableModelClass = mapping.join.through.modelClass;
  } else {
    this.joinTableModelClass = inheritModel(Model);
    this.joinTableModelClass.tableName = this.joinTable;
    // We cannot know if the join table has a primary key. Therefore we set some
    // known column as the idColumn so that inserts will work.
    this.joinTableModelClass.idColumn = this.joinTableRelatedCol;
  }

  this.joinTableOwnerProp = this.joinTableModelClass.columnNameToPropertyName(this.joinTableOwnerCol);
  this.joinTableRelatedProp = this.joinTableModelClass.columnNameToPropertyName(this.joinTableRelatedCol);

  return retVal;
};

/**
 * Reference to the column in the join table that refers to `fullOwnerCol()`.
 *
 * For example: `Person_Movie.actorId`.
 *
 * @returns {string}
 */
ManyToManyRelation.prototype.fullJoinTableOwnerCol = function () {
  return this.joinTable + '.' + this.joinTableOwnerCol;
};

/**
 * Reference to the column in the join table that refers to `fullRelatedCol()`.
 *
 * For example: `Person_Movie.movieId`.
 *
 * @returns {string}
 */
ManyToManyRelation.prototype.fullJoinTableRelatedCol = function () {
  return this.joinTable + '.' + this.joinTableRelatedCol;
};

/**
 * Alias to use for the join table when joining with the owner table.
 *
 * For example: `Person_Movie_rel_movies`.
 *
 * @returns {string}
 */
ManyToManyRelation.prototype.joinTableAlias = function () {
  return  this.joinTable + '_rel_' + this.name;
};

/**
 * @inheritDoc
 * @override
 */
ManyToManyRelation.prototype.clone = function () {
  var clone = Relation.prototype.clone.call(this);

  clone.joinTable = this.joinTable;
  clone.joinTableOwnerCol = this.joinTableOwnerCol;
  clone.joinTableOwnerProp = this.joinTableOwnerProp;
  clone.joinTableRelatedCol = this.joinTableRelatedCol;
  clone.joinTableRelatedProp = this.joinTableRelatedProp;
  clone.joinTableModelClass = this.joinTableModelClass;

  return clone;
};

/**
 * @inheritDoc
 * @override
 */
ManyToManyRelation.prototype.bindKnex = function (knex) {
  var bound = Relation.prototype.bindKnex.call(this, knex);

  bound.joinTableModelClass = this.joinTableModelClass.bindKnex(knex);

  return bound;
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
ManyToManyRelation.prototype.findQuery = function (builder, ownerCol, isColumnRef) {
  builder.join(this.joinTable, this.fullJoinTableRelatedCol(), this.fullRelatedCol());

  if (isColumnRef) {
    builder.whereRef(this.fullJoinTableOwnerCol(), ownerCol);
  } else {
    if (_.isArray(ownerCol)) {
      builder.whereIn(this.fullJoinTableOwnerCol(), ownerCol);
    } else {
      builder.where(this.fullJoinTableOwnerCol(), ownerCol);
    }
  }

  return builder.call(this.filter);
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
ManyToManyRelation.prototype.join = function (builder, joinMethod) {
  joinMethod = joinMethod || 'join';

  var joinTable = this.joinTable;
  var relatedTable = this.relatedModelClass.tableName;

  var joinTableAlias = this.joinTableAlias();
  var relatedTableAlias = this.relatedTableAlias();

  var joinTableAsAlias = joinTable + ' as ' +  joinTableAlias;
  var relatedTableAsAlias = relatedTable + ' as ' + relatedTableAlias;

  var joinTableOwnerCol = joinTableAlias + '.' + this.joinTableOwnerCol;
  var joinTableRelatedCol = joinTableAlias + '.' + this.joinTableRelatedCol;

  var ownerCol = this.fullOwnerCol();
  var relatedCol = relatedTableAlias + '.' + this.relatedCol;

  return builder
    [joinMethod](joinTableAsAlias, joinTableOwnerCol, ownerCol)
    [joinMethod](relatedTableAsAlias, joinTableRelatedCol, relatedCol)
    .call(this.filter);
};

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.find = function (builder, owners) {
  var self = this;

  builder.onBuild(function (builder) {
    var ownerIds = _.pluck(owners, self.ownerProp);
    var ownerJoinColumn = self.fullJoinTableOwnerCol();

    if (!builder.has(/select/)) {
      // If the user hasn't specified a select clause, select the related model's columns.
      // If we don't do this we also get the join table's columns.
      builder.select(self.relatedModelClass.tableName + '.*');
    }

    self.findQuery(builder, ownerIds).select(ownerJoinColumn + ' as ' + ownerJoinColumnAlias);
  });

  builder.runAfterModelCreate(function (related) {
    // The ownerJoinColumnAlias column name may have been changed by the `$parseDatabaseJson`
    // method of the related model class. We need to do the same conversion here.
    var ownerJoinPropAlias = self.relatedModelClass.columnNameToPropertyName(ownerJoinColumnAlias);
    var relatedByOwnerId = _.groupBy(related, ownerJoinPropAlias);

    _.each(owners, function (owner) {
      owner[self.name] = relatedByOwnerId[owner[self.ownerProp]] || [];
    });

    _.each(related, function (rel) {
      delete rel[ownerJoinPropAlias];
    });

    return related;
  });
};

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.insert = function (builder, owner, insertion) {
  var self = this;

  builder.onBuild(function (builder) {
    builder.$$insert(insertion);
  });

  builder.runAfterModelCreate(function (related) {
    var ownerId = owner[self.ownerProp];
    var relatedIds = _.pluck(related, self.relatedProp);
    var joinModels = self._createJoinModels(ownerId, relatedIds);

    owner[self.name] = self.mergeModels(owner[self.name], related);

    // Insert the join rows to the join table.
    return self.joinTableModelClass
      .bindKnex(builder.modelClass().knex())
      .query()
      .childQueryOf(builder)
      .insert(joinModels)
      .return(related);
  });
};

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.update = function (builder, owner, update) {
  var self = this;

  builder.onBuild(function (builder) {
    var idSelectQuery = self._makeFindIdQuery(builder, owner[self.ownerProp]);

    builder
      .$$update(update)
      .whereIn(self.relatedModelClass.getFullIdColumn(), idSelectQuery)
      .call(self.filter);
  });
};

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.patch = function (builder, owner, patch) {
  return this.update(builder, owner, patch);
};

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.delete = function (builder, owner) {
  var self = this;

  builder.onBuild(function (builder) {
    var idSelectQuery = self._makeFindIdQuery(builder, owner[self.ownerProp]);

    builder
      .$$delete()
      .whereIn(self.relatedModelClass.getFullIdColumn(), idSelectQuery)
      .call(self.filter);
  });
};

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.relate = function (builder, owner, ids) {
  var self = this;

  builder.setQueryExecutor(function () {
    var joinModels = self._createJoinModels(owner[self.ownerProp], ids);

    return self.joinTableModelClass
      .bindKnex(self.ownerModelClass.knex())
      .query()
      .childQueryOf(builder)
      .insert(joinModels)
      .runAfter(_.constant({}));
  });
};

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.unrelate = function (builder, owner) {
  var self = this;

  builder.setQueryExecutor(function (builder) {
    var idSelectQuery = self.relatedModelClass
      .query()
      .childQueryOf(builder)
      .copyFrom(builder, /where/i)
      .select(self.fullRelatedCol())
      .call(self.filter);

    return self.joinTableModelClass
      .bindKnex(self.ownerModelClass.knex())
      .query()
      .childQueryOf(builder)
      .delete()
      .where(self.fullJoinTableOwnerCol(), owner[self.ownerProp])
      .whereIn(self.fullJoinTableRelatedCol(), idSelectQuery)
      .runAfter(_.constant({}));
  });
};

/**
 * @private
 */
ManyToManyRelation.prototype._makeFindIdQuery = function (builder, ownerId) {
  return this.joinTableModelClass
    .bindKnex(this.ownerModelClass.knex())
    .query()
    .childQueryOf(builder)
    .select(this.fullJoinTableRelatedCol())
    .where(this.fullJoinTableOwnerCol(), ownerId);
};

/**
 * @private
 */
ManyToManyRelation.prototype._createJoinModels = function (ownerId, relatedIds) {
  var self = this;

  return _.map(relatedIds, function (relatedId) {
    var joinModel = {};

    joinModel[self.joinTableOwnerProp] = ownerId;
    joinModel[self.joinTableRelatedProp] = relatedId;

    return joinModel;
  });
};

module.exports = ManyToManyRelation;
