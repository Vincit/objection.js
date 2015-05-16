"use strict";

var _ = require('lodash')
  , MoronRelation = require('./MoronRelation')
  , ownerJoinColumnAlias = '_join_';

/**
 * @constructor
 * @extends MoronRelation
 */
function MoronManyToManyRelation() {
  MoronRelation.apply(this, arguments);
}

MoronRelation.makeSubclass(MoronManyToManyRelation);

MoronManyToManyRelation.prototype.find = function (builder, $owners) {
  var self = this;
  var owners = this.ownerModelClass.ensureModelArray($owners);
  var ownerJoinColumn = this.joinTable + '.' + this.ownerJoinColumn;

  if (!builder.has('select')) {
    builder.select(this.relatedModelClass.tableName + '.*');
  }

  // Add the statements that select the owners' rows.
  this._makeFindQuery(builder, _.unique(_.pluck(owners, this.ownerModelClass.idProperty)));

  // Select the joined identifier of the owner model.
  builder.select(ownerJoinColumn + ' as ' + ownerJoinColumnAlias);

  return builder.runAfterModelCreatePushFront(function (related) {
    var relatedByOwnerId = _.groupBy(related, ownerJoinColumnAlias);

    _.each(owners, function (owner) {
      owner[self.name] = relatedByOwnerId[owner.$id()] || [];
    });

    _.each(related, function (rel) {
      delete rel[ownerJoinColumnAlias];
    });

    return related;
  });
};

MoronManyToManyRelation.prototype.insert = function (builder, $owner, $insertion) {
  var self = this;
  var owner = this.ownerModelClass.ensureModel($owner);

  // This adds the insert operation and the needed runAfter* methods.
  this.relatedModelClass.$$insert(builder, $insertion);

  return builder.runAfterModelCreate(function (related) {
    var rIdProp = self.relatedModelClass.idProperty;
    var joinRows = self._createJoinRows(owner.$id(), _.isArray(related) ? _.pluck(related, rIdProp) : [related.$id()]);

    owner[self.name] = _.compact(_.flatten([owner[self.name], related]));
    // Insert the join rows to the join table.
    return self.relatedModelClass
      .knexQuery(builder.transaction())
      .insert(joinRows)
      .into(self.joinTable)
      .return(related);
  });
};

MoronManyToManyRelation.prototype.update = function (builder, $owner, $update) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var idSelectQuery = this._makeFindIdQuery(builder, [owner.$id()]).build();

  // Clear all statements but increment and decrement. We don't want to include
  // them in the main query since they are also in the idSelectQuery sub query.
  // increment and decrement are actually update statements and they need to be
  // in the main query.
  builder.clearAllBut('increment', 'decrement');

  // This adds the update operation and the needed runAfter* methods.
  this.relatedModelClass.$$update(builder, $update);

  return builder.whereIn(this.relatedModelClass.idProperty, idSelectQuery);
};

MoronManyToManyRelation.prototype.patch = function (builder, $owner, $patch) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var idSelectQuery = this._makeFindIdQuery(builder, [owner.$id()]).build();

  // Clear all statements but increment and decrement. We don't want to include
  // them in the main query since they are also in the idSelectQuery sub query.
  // increment and decrement are actually update statements and they need to be
  // in the main query.
  builder.clearAllBut('increment', 'decrement');

  // This adds the patch operation and the needed runAfter* methods.
  this.relatedModelClass.$$patch(builder, $patch);

  return builder.whereIn(this.relatedModelClass.idProperty, idSelectQuery);
};

MoronManyToManyRelation.prototype.delete = function (builder, $owner) {
  var self = this;
  var owner = this.ownerModelClass.ensureModel($owner);
  var idSelectQuery = this._makeFindIdQuery(builder, [owner.$id()]).build();

  // Clear all statements. We don't want to include them in the main query since they
  // are also in the idSelectQuery sub query.
  builder.clear();

  // This adds the delete operation and the needed runAfter* methods.
  this.relatedModelClass.$$delete(builder);

  return builder.whereIn(this.relatedModelClass.idProperty, idSelectQuery).runBefore(function (result) {
    var relatedJoinColumn = self.joinTable + '.' + self.relatedJoinColumn;

    // Delete the join rows from the join table.
    return self.relatedModelClass
      .knexQuery(builder.transaction())
      .delete()
      .from(self.joinTable)
      .whereIn(relatedJoinColumn, idSelectQuery)
      .return(result);
  });
};

MoronManyToManyRelation.prototype.relate = function (builder, $owner, $ids) {
  var owner = this.ownerModelClass.ensureModel($owner);
  var joinRows = this._createJoinRows(owner.$id(), _.flatten([$ids]));
  var arrayInput = _.isArray($ids);

  // Insert join rows into the join table.
  return builder.insert(joinRows).into(this.joinTable).returning('id').runAfterModelCreatePushFront(function (ids) {
    _.each(ids, function (id, idx) {
      if (id) { joinRows[idx].id = id; }
    });
    return arrayInput ? joinRows : joinRows[0];
  });
};

MoronManyToManyRelation.prototype.unrelate = function (builder, $owner) {
  var self = this;
  var owner = this.ownerModelClass.ensureModel($owner);
  var idSelectQuery = this._makeFindIdQuery(builder, [owner.$id()]).build();
  var relatedJoinColumn = self.joinTable + '.' + self.relatedJoinColumn;

  // Clear all statements. We don't want to include them in the main query since they
  // are also in the idSelectQuery sub query.
  builder.clear();

  // Delete the join rows from the join table.
  return builder
    .delete()
    .from(self.joinTable)
    .whereIn(relatedJoinColumn, idSelectQuery)
    .runAfterModelCreatePushFront(_.constant({}));
};

MoronManyToManyRelation.prototype._makeFindQuery = function (builder, ownerIds) {
  var ownerJoinColumn = this.joinTable + '.' + this.ownerJoinColumn;
  var relatedIdColumn = this.relatedModelClass.tableName + '.' + this.relatedModelClass.idProperty;
  var relatedJoinColumn = this.joinTable + '.' + this.relatedJoinColumn;

  return builder
    .join(this.joinTable, relatedJoinColumn, relatedIdColumn)
    .whereIn(ownerJoinColumn, ownerIds);
};

MoronManyToManyRelation.prototype._makeFindIdQuery = function (builder, ownerIds) {
  builder = builder
    .clone()
    .clearCustomImpl()
    .clear('insert', 'update', 'patch', 'delete', 'del', 'relate', 'unrelate', 'increment', 'decrement', 'orderBy', 'select')
    .select(this.relatedModelClass.tableName + '.' + this.relatedModelClass.idProperty);

  return this._makeFindQuery(builder, ownerIds);
};

MoronManyToManyRelation.prototype._createJoinRows = function (ownerId, relatedIds) {
  var self = this;

  if (!_.isArray(relatedIds)) {
    relatedIds = [relatedIds];
  }

  return _.map(relatedIds, function (relatedId) {
    var joinRow = {};

    joinRow[self.ownerJoinColumn] = ownerId;
    joinRow[self.relatedJoinColumn] = relatedId;

    return joinRow;
  });
};

module.exports = MoronManyToManyRelation;
