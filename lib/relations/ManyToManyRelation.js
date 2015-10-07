'use strict';

var _ = require('lodash')
  , Relation = require('./Relation')
  , ownerJoinColumnAlias = 'objectiontmpjoin';

/**
 * @constructor
 * @ignore
 * @extends Relation
 */
function ManyToManyRelation() {
  Relation.apply(this, arguments);
}

Relation.extend(ManyToManyRelation);

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.setMapping = function (mapping) {
  var retVal = Relation.prototype.setMapping.call(this, mapping);

  if (!this.joinTable || !this.joinTableOwnerCol || !this.joinTableRelatedCol) {
    throw new Error(this.ownerModelClass.name + '.relationMappings.' + this.name + '.join must have the `through` that describes the join table.');
  }

  return retVal;
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

  return builder
    [joinMethod](joinTable + ' as ' +  joinTableAlias, joinTableAlias + '.' + this.joinTableOwnerCol, this.fullOwnerCol())
    [joinMethod](relatedTable + ' as ' + relatedTableAlias, joinTableAlias + '.' + this.joinTableRelatedCol, relatedTableAlias + '.' + this.relatedCol)
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

    if (!builder.has('select')) {
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
    var joinRows = self._createJoinRows(ownerId, relatedIds);

    owner[self.name] = self.mergeModels(owner[self.name], related);

    // Insert the join rows to the join table.
    return self.relatedModelClass
      .knexQuery()
      .insert(joinRows)
      .into(self.joinTable)
      .then(function () {
        return related;
      });
  });
};

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.update = function (builder, owner, update) {
  var self = this;

  builder.onBuild(function (builder) {
    var idSelectQuery = self._makeFindIdQuery(owner[self.ownerProp]);

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
    var idSelectQuery = self._makeFindIdQuery(owner[self.ownerProp]);

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

  builder.onBuild(function (builder) {
    var joinRows = self._createJoinRows(owner[self.ownerProp], ids);
    // This is a bit weird: we make this query to the joinTable even though
    // this query builder is bound to the related model class.
    builder.$$insert(joinRows).into(self.joinTable);
  });
};

/**
 * @override
 * @inheritDoc
 */
ManyToManyRelation.prototype.unrelate = function (builder, owner) {
  var self = this;

  builder.onBuild(function (builder) {
    var idSelectQuery = self.relatedModelClass
      .query()
      .copyFrom(builder, /where/i)
      .select(self.fullRelatedCol())
      .call(self.filter);

    // This is a bit weird: we make this query to the joinTable even though
    // this query builder is bound to the related model class.
    builder
      .clear()
      .$$delete()
      .from(self.joinTable)
      .where(self.fullJoinTableOwnerCol(), owner[self.ownerProp])
      .whereIn(self.fullJoinTableRelatedCol(), idSelectQuery);
  });
};

/**
 * @private
 */
ManyToManyRelation.prototype._makeFindIdQuery = function (ownerId) {
  return this.ownerModelClass
    .knex()
    .select(this.fullJoinTableRelatedCol())
    .from(this.joinTable)
    .where(this.fullJoinTableOwnerCol(), ownerId);
};

/**
 * @private
 */
ManyToManyRelation.prototype._createJoinRows = function (ownerId, relatedIds) {
  var self = this;

  return _.map(relatedIds, function (relatedId) {
    var joinRow = {};

    joinRow[self.joinTableOwnerCol] = ownerId;
    joinRow[self.joinTableRelatedCol] = relatedId;

    return joinRow;
  });
};

module.exports = ManyToManyRelation;
