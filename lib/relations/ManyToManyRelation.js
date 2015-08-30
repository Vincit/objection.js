'use strict';

var _ = require('lodash')
  , Relation = require('./Relation')
  , ownerJoinColumnAlias = '_join_';

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
ManyToManyRelation.prototype.find = function (builder, $owners) {
  var self = this;
  var owners = this.ownerModelClass.ensureModelArray($owners);

  if (!builder.has('select')) {
    // If the user hasn't specified a select clause, select the related model's columns.
    // If we don't do this we also get the join table's columns.
    builder.select(this.relatedModelClass.tableName + '.*');
  }

  return this
    .findQuery(builder, _.chain(owners).pluck(this.ownerProp).unique().value())
    .select(this.fullJoinTableOwnerCol() + ' as ' + ownerJoinColumnAlias)
    .runAfterModelCreate(function (related) {
      var relatedByOwnerId = _.groupBy(related, ownerJoinColumnAlias);

      _.each(owners, function (owner) {
        owner[self.name] = relatedByOwnerId[owner[self.ownerProp]] || [];
      });

      _.each(related, function (rel) {
        delete rel[ownerJoinColumnAlias];
      });

      return related;
    });
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
 * @returns {QueryBuilder}
 */
ManyToManyRelation.prototype.insert = function (builder, $owner, $insertion) {
  var self = this;
  var owner = this.ownerModelClass.ensureModel($owner);

  return this.relatedModelClass
    .$$insert(builder, $insertion)
    .runAfterModelCreate(function (related) {
      var joinRows = self._createJoinRows(owner[self.ownerProp], _.isArray(related)
        ? _.pluck(related, self.relatedProp)
        : [related[self.relatedProp]]);

      owner[self.name] = _.chain([owner[self.name], related]).flatten().compact().value();
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
 * @returns {QueryBuilder}
 */
ManyToManyRelation.prototype.update = function (builder, $owner, $update) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var idSelectQuery = this._makeFindIdQuery(owner[this.ownerProp]);

  return this.relatedModelClass
    .$$update(builder, $update)
    .whereIn(this.relatedModelClass.getFullIdColumn(), idSelectQuery)
    .call(this.filter);
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
ManyToManyRelation.prototype.patch = function (builder, $owner, $patch) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var idSelectQuery = this._makeFindIdQuery(owner[this.ownerProp]);

  return this.relatedModelClass
    .$$patch(builder, $patch)
    .whereIn(this.relatedModelClass.getFullIdColumn(), idSelectQuery)
    .call(this.filter);
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
ManyToManyRelation.prototype.delete = function (builder, $owner) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var idSelectQuery = this._makeFindIdQuery(owner[this.ownerProp]);

  return this.relatedModelClass
    .$$delete(builder)
    .whereIn(this.relatedModelClass.getFullIdColumn(), idSelectQuery)
    .call(this.filter);
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
ManyToManyRelation.prototype.relate = function (builder, $owner, $ids) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var joinRows = this._createJoinRows(owner[this.ownerProp], _.flatten([$ids]));
  var arrayInput = _.isArray($ids);

  // Insert join rows into the join table.
  return builder
    .knexInsert(joinRows)
    .into(this.joinTable)
    .returning('id')
    .runAfterModelCreate(function (ids) {
      _.each(joinRows, function (row, idx) {
        row.id = ids[idx] || null;
      });
      return arrayInput ? joinRows : joinRows[0];
    });
};

/**
 * @override
 * @inheritDoc
 * @returns {QueryBuilder}
 */
ManyToManyRelation.prototype.unrelate = function (builder, $owner) {
  var self = this;
  var owner = this.ownerModelClass.ensureModel($owner);

  var idSelectQuery = builder
    .clone()
    .clear('select')
    .clearCustomImpl()
    .select(this.fullRelatedCol())
    .call(this.filter);

  // Delete the join rows from the join table.
  return builder
    .clear()
    .knexDelete()
    .from(self.joinTable)
    .where(self.fullJoinTableOwnerCol(), owner[this.ownerProp])
    .whereIn(self.fullJoinTableRelatedCol(), idSelectQuery)
    .runAfterModelCreate(_.constant({}));
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
