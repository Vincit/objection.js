'use strict';

var _ = require('lodash');

/**
 * Internal representation of insert and update data.
 *
 * Data passed to update or insert queries can be:
 *
 *  1. Javascript primitives
 *  2. knex raw SQL expressions
 *  3. knex queries
 *  4. objection queries
 *
 * This class splits the insert data into two parts:
 *
 *  Part 1:
 *    * Javascript primitives
 *
 *  Part 2:
 *    * everything else
 *
 * The part 1 is converted into `Model` instances and the part 2 is left untouched. As the `InsertionOrUpdate`
 * instance passes through objection during an insert or update operation, the different functions can operate
 * on the models (for example call $beforeInsert etc. methods on them). When the `InsertionOrUpdate` instance
 * finally reaches knex, the two parts are glued back together.
 *
 * @ignore
 * @constructor
 */
function InsertionOrUpdate(QueryBuilder, ModelClass) {
  this.QueryBuilder = QueryBuilder;
  this.ModelClass = ModelClass;

  this._models = [];
  this._rawOrQuery = [];
  this._arrayInput = false;
}

InsertionOrUpdate.prototype.model = function () {
  return this._models[0];
};

InsertionOrUpdate.prototype.models = function () {
  return this._models;
};

/**
 * Returns true if the input to `setData` method was an array.
 *
 * @ignore
 * @returns {boolean}
 */
InsertionOrUpdate.prototype.isArray = function () {
  return this._arrayInput;
};

/**
 * Sets the actual insert/update data.
 *
 * @ignore
 * @param {Object|Array.<Object>} data
 * @param {ModelOptions} modelOptions
 */
InsertionOrUpdate.prototype.setData = function (data, modelOptions) {
  var self = this;
  var knex = this.ModelClass.knex();
  var KnexQueryBuilder = knex.client.QueryBuilder;
  var Raw = knex.client.Raw;

  // knex.QueryBuilder and knex.Raw are not documented properties.
  // We make sure here that things break if knex changes things.
  if (!_.isFunction(KnexQueryBuilder) || !_.isFunction(Raw)) {
    throw new Error('knex API has changed: knex.QueryBuilder or knex.Raw constructor missing.');
  }

  this._models = [];
  this._rawOrQuery = [];
  this._arrayInput = _.isArray(data);

  if (!this._arrayInput) {
    data = _.isObject(data) ? [data] : [];
  }

  // Separate raw queries and query builders from javascript primitives.
  // The javascript primitives are converted into a Model instance and the
  // "query" properties are stored separately.
  _.each(data, function (obj) {
    if (obj instanceof self.ModelClass) {
      self._models.push(obj);
      self._rawOrQuery.push({});
    } else {
      var modelJson = {};
      var rawOrSubquery = {};

      _.each(obj, function (value, key) {
        if (value instanceof KnexQueryBuilder|| value instanceof Raw) {
          rawOrSubquery[key] = value;
        } else if (value instanceof self.QueryBuilder) {
          rawOrSubquery[key] = value.build();
        } else {
          modelJson[key] = value;
        }
      });

      self._models.push(self.ModelClass.fromJson(modelJson, modelOptions));
      self._rawOrQuery.push(rawOrSubquery);
    }
  });
};

/**
 * Create an object that can be given for the knex update or insert method.
 *
 * @ignore
 * @returns {Object|Array.<Object>}
 */
InsertionOrUpdate.prototype.toKnexInput = function () {
  var self = this;

  var knexInput = _.map(this._models, function (model, i) {
    var modelJson = model.$toDatabaseJson();

    var rawOrQuery = _.mapKeys(self._rawOrQuery[i], function (value, key) {
      return model.constructor.propertyNameToColumnName(key);
    });

    return _.merge(modelJson, rawOrQuery);
  });

  if (knexInput.length === 1) {
    return knexInput[0];
  } else {
    return knexInput;
  }
};

module.exports = InsertionOrUpdate;
