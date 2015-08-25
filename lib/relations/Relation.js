'use strict';

var _ = require('lodash')
  , utils = require('../utils')
  , QueryBuilder = require('../QueryBuilder');

/**
 * @typedef {Object} RelationJoin
 *
 * An object literal that describes how two tables are related to one another. For example:
 *
 * ```js
 * {
 *   from: 'Animal.ownerId',
 *   to: 'Person.id'
 * }
 * ```
 *
 * or in the case of a many-to-many relation:
 *
 * ```js
 * {
 *   from: 'Person.id',
 *   through: {
 *     from: 'Person_Movie.actorId',
 *     to: 'Person_Movie.movieId'
 *   },
 *   to: 'Movie.id'
 * }
 * ```
 *
 * @property {String} from
 *    The relation column in the owner table. Must be given with the table name.
 *    For example `Person.id`. Note that neither this nor `to` need to be foreign
 *    keys or primary keys. You can join any column to any column.
 *
 * @property {String} to
 *    The relation column in the related table. Must be given with the table name.
 *    For example `Movie.id`. Note that neither this nor `from` need to be foreign
 *    keys or primary keys. You can join any column to any column.
 *
 * @property {Object} through
 *    Describes the join table if the models are related through one.
 *
 * @property {String} through.from
 *    The column that is joined to `from` property of the `RelationJoin`. For example
 *    `Person_Movie.actorId` where `Person_Movie` is the join table.
 *
 * @property {String} through.to
 *    The column that is joined to `to` property of the `RelationJoin`. For example
 *    `Person_Movie.movieId` where `Person_Movie` is the join table.
 */

/**
 * @typedef {Object} RelationMapping
 *
 * @property {Model|String} modelClass
 *    A {@link Model} subclass constructor or an absolute path to a module that exports one.
 *
 * @property {Relation} relation
 *    A relation constructor. You can use one of Model.OneToOneRelation, Model.OneToManyRelation and
 *    Model.ManyToManyRelation or even write your own relation type by subclassing {@link Relation}.
 *
 * @property {Object|function(QueryBuilder)} filter
 *    Additional filter for the relation. It can be either a hash of {column: 'value'} pairs or
 *    a function that takes a QueryBuilder as a parameter.
 *
 * @property {RelationJoin} [join]
 *    An object that describes how the two models are related.
 */

/**
 * Represents a relation between two `Model` subclasses.
 *
 * This is an abstract base class and should never be instantiated.
 *
 * @param {String} relationName
 *    Name of the relation.
 *
 * @param {Model} OwnerClass
 *    The Model subclass that owns this relation.
 *
 * @ignore
 * @abstract
 * @constructor
 */
function Relation(relationName, OwnerClass) {
  /**
   * Name of the relation.
   *
   * @type {String}
   */
  this.name = relationName;

  /**
   * The owner class of this relation.
   *
   * This must be a subclass of Model.
   *
   * @type {Model}
   */
  this.ownerModelClass = OwnerClass;

  /**
   * The related class.
   *
   * This must be a subclass of Model.
   *
   * @type {Model}
   */
  this.relatedModelClass = null;

  /**
   * The relation column in the owner table.
   *
   * @type {String}
   */
  this.ownerCol = null;

  /**
   * The relation property in the owner model.
   *
   * @type {String}
   */
  this.ownerProp = null;

  /**
   * The relation column in the related table.
   *
   * @type {String}
   */
  this.relatedCol = null;

  /**
   * The relation property in the related model.
   *
   * @type {String}
   */
  this.relatedProp = null;

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
   * The relation column in the join table that points to the related table.
   *
   * @type {String}
   */
  this.joinTableRelatedCol = null;

  /**
   * Optional additional filter query.
   *
   * @type {function (QueryBuilder)}
   */
  this.filter = null;
}

/**
 * Makes the given constructor a subclass of this class.
 *
 * @param {function=} subclassConstructor
 * @return {function}
 */
Relation.extend = function (subclassConstructor) {
  utils.inherits(subclassConstructor, this);
  return subclassConstructor;
};

/**
 * Constructs the instance based on a mapping data.
 *
 * @param {RelationMapping} mapping
 */
Relation.prototype.setMapping = function (mapping) {
  // Avoid require loop and import here.
  var Model = require(__dirname + '/../Model');

  if (!utils.isSubclassOf(this.ownerModelClass, Model)) {
    throw new Error('Relation\'s owner is not a subclass of Model');
  }

  var errorPrefix = this.ownerModelClass.name + '.relationMappings.' + this.name;

  if (!mapping.modelClass) {
    throw new Error(errorPrefix + '.modelClass is not defined');
  }

  if (_.isString(mapping.modelClass)) {
    try {
      this.relatedModelClass = require(mapping.modelClass);
    } catch (err) {
      throw new Error(errorPrefix + '.modelClass is an invalid file path to a model class.');
    }

    if (!utils.isSubclassOf(this.relatedModelClass, Model)) {
      throw new Error(errorPrefix + '.modelClass is a valid path to a module, but the module doesn\'t export a Model subclass.');
    }
  } else {
    this.relatedModelClass = mapping.modelClass;

    if (!utils.isSubclassOf(this.relatedModelClass, Model)) {
      throw new Error(errorPrefix + '.modelClass is not a subclass of Model or a file path to a module that exports one.');
    }
  }

  if (!mapping.relation) {
    throw new Error(errorPrefix + '.relation is not defined');
  }

  if (!utils.isSubclassOf(mapping.relation, Relation)) {
    throw new Error(errorPrefix + '.relation is not a subclass of Relation');
  }

  if (!mapping.join || !_.isString(mapping.join.from) || !_.isString(mapping.join.to)) {
    throw new Error(errorPrefix + '.join must be an object that maps the columns of the related models together. For example: {from: \'SomeTable.id\', to: \'SomeOtherTable.someModelId\'}');
  }

  var joinOwner = null;
  var joinRelated = null;

  var joinFrom = parseColumn(mapping.join.from);
  var joinTo = parseColumn(mapping.join.to);

  if (!joinFrom.table || !joinFrom.name) {
    throw new Error(errorPrefix + '.join.from must have format TableName.columnName. For example `SomeTable.id`.');
  }

  if (!joinTo.table || !joinTo.name) {
    throw new Error(errorPrefix + '.join.to must have format TableName.columnName. For example `SomeTable.id`.');
  }

  if (joinFrom.table === this.ownerModelClass.tableName) {
    joinOwner = joinFrom;
    joinRelated = joinTo;
  } else if (joinTo.table === this.ownerModelClass.tableName) {
    joinOwner = joinTo;
    joinRelated = joinFrom;
  } else {
    throw new Error(errorPrefix + '.join: either `from` or `to` must point to the owner model table.');
  }

  if (joinRelated.table !== this.relatedModelClass.tableName) {
    throw new Error(errorPrefix + '.join: either `from` or `to` must point to the related model table.');
  }

  if (mapping.join.through) {
    if (!_.isString(mapping.join.through.from) || !_.isString(mapping.join.through.to)) {
      throw new Error(errorPrefix + '.join.through must be an object that describes the join table. For example: {from: \'JoinTable.someId\', to: \'JoinTable.someOtherId\'}');
    }

    var joinTableFrom = parseColumn(mapping.join.through.from);
    var joinTableTo = parseColumn(mapping.join.through.to);

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
  }

  this.ownerProp = this._propertyName(joinOwner, this.ownerModelClass);
  this.ownerCol = joinOwner.name;
  this.relatedProp = this._propertyName(joinRelated, this.relatedModelClass);
  this.relatedCol = joinRelated.name;
  this.filter = parseFilter(mapping);
};

/**
 * Reference to the relation column in the owner model's table.
 *
 * For example: `Person.id`.
 *
 * @returns {string}
 */
Relation.prototype.fullOwnerCol = function () {
  return this.ownerModelClass.tableName + '.' + this.ownerCol;
};

/**
 * Reference to the relation column in the related model's table.
 *
 * For example: `Movie.id`.
 *
 * @returns {string}
 */
Relation.prototype.fullRelatedCol = function () {
  return this.relatedModelClass.tableName + '.' + this.relatedCol;
};

/**
 * Reference to the column in the join table that is joined with `fullOwnerCol()`.
 *
 * For example: `Person_Movie.actorId`.
 *
 * @returns {string}
 */
Relation.prototype.fullJoinTableOwnerCol = function () {
  return this.joinTable + '.' + this.joinTableOwnerCol;
};

/**
 * Reference to the column in the join table that is joined with `fullRelatedCol()`.
 *
 * For example: `Person_Movie.movieId`.
 *
 * @returns {string}
 */
Relation.prototype.fullJoinTableRelatedCol = function () {
  return this.joinTable + '.' + this.joinTableRelatedCol;
};

/**
 * Alias to use for the related table when joining with the owner table.
 *
 * For example: `Movie_rel_movies`.
 *
 * @returns {string}
 */
Relation.prototype.relatedTableAlias = function () {
  return this.relatedModelClass.tableName + '_rel_' + this.name;
};

/**
 * Alias to use for the join table when joining with the owner table.
 *
 * For example: `Person_Movie_rel_movies`.
 *
 * @returns {string}
 */
Relation.prototype.joinTableAlias = function () {
  return  this.joinTable + '_rel_' + this.name;
};

/**
 * Clones this relation.
 *
 * @returns {Relation}
 */
Relation.prototype.clone = function () {
  var clone = new this.constructor(this.name, this.ownerModelClass);

  clone.relatedModelClass = this.relatedModelClass;
  clone.ownerCol = this.ownerCol;
  clone.ownerProp = this.ownerProp;
  clone.relatedCol = this.relatedCol;
  clone.relatedProp = this.relatedProp;
  clone.joinTable = this.joinTable;
  clone.joinTableOwnerCol = this.joinTableOwnerCol;
  clone.joinTableRelatedCol = this.joinTableRelatedCol;
  clone.filter = this.filter;

  return clone;
};

/**
 * Returns a clone of this relation with `relatedModelClass` and `ownerModelClass` bound to the given knex.
 *
 * See `Model.bindKnex`.
 *
 * @param knex
 * @returns {Relation}
 */
Relation.prototype.bindKnex = function (knex) {
  var bound = this.clone();

  bound.relatedModelClass = bound.relatedModelClass.bindKnex(knex);
  bound.ownerModelClass = bound.ownerModelClass.bindKnex(knex);

  return bound;
};

/* istanbul ignore next */
/**
 * @abstract
 * @param {QueryBuilder} builder
 * @param {number|string} ownerCol
 * @param {boolean} isColumnRef
 * @returns {QueryBuilder}
 */
Relation.prototype.findQuery = function (builder, ownerCol, isColumnRef) {
  throw new Error('not implemented');
};

/* istanbul ignore next */
/**
 * @abstract
 * @param {QueryBuilder} builder
 * @param {Model|Object|Array.<Model>|Array.<Object>} $owners
 * @returns {QueryBuilder}
 */
Relation.prototype.find = function (builder, $owners) {
  throw new Error('not implemented');
};

/* istanbul ignore next */
/**
 * @abstract
 * @param {QueryBuilder} builder
 * @param {string} joinMethod
 * @returns {QueryBuilder}
 */
Relation.prototype.join = function (builder, joinMethod) {
  throw new Error('not implemented');
};

/* istanbul ignore next */
/**
 * @param {QueryBuilder} builder
 * @param {Model|Object} $owner
 * @param {Model|Object|Array.<Model>|Array.<Object>} $insertion
 * @returns {QueryBuilder}
 */
Relation.prototype.insert = function (builder, $owner, $insertion) {
  throw new Error('not implemented');
};

/* istanbul ignore next */
/**
 * @abstract
 * @param {QueryBuilder} builder
 * @param {Model|Object} $owner
 * @param {Model|Object} $update
 * @returns {QueryBuilder}
 */
Relation.prototype.update = function (builder, $owner, $update) {
  return builder;
};

/* istanbul ignore next */
/**
 * @abstract
 * @param {QueryBuilder} builder
 * @param {Model|Object} $owner
 * @param {Model|Object} $patch
 * @returns {QueryBuilder}
 */
Relation.prototype.patch = function (builder, $owner, $patch) {
  throw new Error('not implemented');
};

/* istanbul ignore next */
/**
 * @abstract
 * @param {QueryBuilder} builder
 * @param {Model|Object} $owner
 * @returns {QueryBuilder}
 */
Relation.prototype.delete = function (builder, $owner) {
  throw new Error('not implemented');
};

/* istanbul ignore next */
/**
 * @abstract
 * @param {QueryBuilder} builder
 * @param {Model|Object} $owner
 * @param {number|string|Array.<number>|Array.<string>} ids
 * @returns {QueryBuilder}
 */
Relation.prototype.relate = function (builder, $owner, ids) {
  throw new Error('not implemented');
};

/* istanbul ignore next */
/**
 * @abstract
 * @param {QueryBuilder} builder
 * @param {Model|Object} $owner
 * @returns {QueryBuilder}
 */
Relation.prototype.unrelate = function (builder, $owner) {
  throw new Error('not implemented');
};

/**
 * @private
 */
Relation.prototype._propertyName = function (column, modelClass) {
  var propertyName = modelClass.columnNameToPropertyName(column.name);

  if (!propertyName) {
    throw new Error(modelClass.name +
    '.$parseDatabaseJson probably transforms the value of the column ' + column.name + '.' +
    ' This is a no-no because ' + column.name +
    ' is needed in the relation ' + this.ownerModelClass.name + '.' + this.name);
  }

  return propertyName;
};

/**
 * @private
 */
function parseFilter(mapping) {
  if (_.isFunction(mapping.filter)) {
    return mapping.filter;
  } else if (_.isObject(mapping.filter)) {
    return function (queryBuilder) {
      queryBuilder.where(mapping.filter);
    };
  } else {
    return _.noop;
  }
}

/**
 * @private
 */
function parseColumn(column) {
  var parts = column.split('.');

  return {
    table: parts[0] && parts[0].trim(),
    name: parts[1] && parts[1].trim()
  };
}

module.exports = Relation;
