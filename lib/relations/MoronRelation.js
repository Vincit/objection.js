"use strict";

var _ = require('lodash')
  , utils = require('../utils')
  , MoronQueryBuilder = require('../MoronQueryBuilder');

/**
 * @typedef {Object} MoronRelationMapping
 *
 * @property {Object} join
 * @property {String} join.table
 * @property {String} join.ownerIdColumn
 * @property {String} join.relatedIdColumn
 * @property {String} joinColumn
 * @property {function (MoronQueryBuilder) | Object} query
 */

/**
 * Represents a relation between two `MoronModel` subclasses.
 *
 * @param {String} relationName
 *    Name of the relation.
 *
 * @param {MoronRelationMapping} mapping
 *    Parameters for this relation.
 *
 * @param {MoronModel} OwnerClass
 *    The MoronModel subclass that owns this relation.
 *
 * @constructor
 */
function MoronRelation(relationName, mapping, OwnerClass) {
  var join = mapping.join || {};
  var additionalQuery = null;

  // joinColumn overrides ownerIdColumn and relatedIdColumn.
  if (mapping.joinColumn) {
    join.ownerIdColumn = mapping.joinColumn;
    join.relatedIdColumn = mapping.joinColumn;
  }

  // The mapping.query can be either an object like {id: 10, name: 'Some name'} or
  // a function that takes a MoronQueryBuilder. Here we normalize it to
  // the function form.
  if (mapping.query) {
    if (_.isFunction(mapping.query)) {
      additionalQuery = mapping.query;
    } else {
      additionalQuery = function (queryBuilder) {
        queryBuilder.where(mapping.query);
      };
    }
  }

  /**
   * Name of the relation.
   *
   * @type {String}
   */
  this.name = relationName;

  /**
   * The mapping from which this relation was constructed.
   *
   * @type {MoronRelationMapping}
   */
  this.mapping = mapping;

  /**
   * The owner class of this relation.
   *
   * This must be a subclass of MoronModel.
   *
   * @type {MoronModel}
   */
  this.ownerModelClass = OwnerClass;

  /**
   * The related class.
   *
   * This must be a subclass of MoronModel.
   *
   * @type {MoronModel}
   */
  this.relatedModelClass = mapping.modelClass;

  /**
   * Name of the database column through which ownerModelClass is joined.
   *
   * @type {String}
   */
  this.ownerJoinColumn = join.ownerIdColumn;

  /**
   * Name of the database column through which relatedModelClass is joined.
   *
   * @type {String}
   */
  this.relatedJoinColumn = join.relatedIdColumn;

  /**
   * Join table name.
   *
   * @type {String}
   */
  this.joinTable = join.table;

  /**
   * Optional additional query.
   *
   * @type {function (MoronQueryBuilder)}
   */
  this.additionalQuery = additionalQuery;
}

/**
 * Makes the given constructor a subclass of this class.
 *
 * @param {function=} subclassConstructor
 * @return {function}
 */
MoronRelation.makeSubclass = function (subclassConstructor) {
  utils.inherits(subclassConstructor, this);
  return subclassConstructor;
};

MoronRelation.prototype.clone = function () {
  // noinspection JSValidateTypes
  return new this.constructor(this.name, this.mapping, this.ownerModelClass);
};

MoronRelation.prototype.find = function (builder, $owners) {
  return builder;
};

MoronRelation.prototype.insert = function (builder, $owner, $insertion) {
  return builder;
};

MoronRelation.prototype.update = function (builder, $owner, $update) {
  return builder;
};

MoronRelation.prototype.patch = function (builder, $owner, $patch) {
  return builder;
};

MoronRelation.prototype.delete = function (builder, $owner) {
  return builder;
};

MoronRelation.prototype.relate = function (builder, $owner, ids) {
  return builder;
};

MoronRelation.prototype.unrelate = function (builder, $owner) {
  return builder;
};

module.exports = MoronRelation;
