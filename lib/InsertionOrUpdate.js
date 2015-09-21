'use strict';

var _ = require('lodash');

/**
 * @ignore
 * @constructor
 */
function InsertOrUpdate(QueryBuilder, ModelClass) {
  this.QueryBuilder = QueryBuilder;
  this.ModelClass = ModelClass;

  this._models = [];
  this._rawOrQuery = [];
  this._arrayInput = false;
}

InsertOrUpdate.prototype.model = function () {
  return _.first(this._models);
};

InsertOrUpdate.prototype.models = function () {
  return this._models;
};

InsertOrUpdate.prototype.isArray = function () {
  return this._arrayInput;
};

InsertOrUpdate.prototype.setModels = function (modelsOrObjects, modelOptions) {
  var self = this;
  var KnexQueryBuilder = this.ModelClass.knex().client.QueryBuilder;
  var Raw = this.ModelClass.knex().client.Raw;

  // knex.QueryBuilder and knex.Raw are not documented properties.
  // We make sure here that things break if knex changes things.
  if (!_.isFunction(KnexQueryBuilder) || !_.isFunction(Raw)) {
    throw new Error('knex API has changed: knex.QueryBuilder or knex.Raw constructor missing.');
  }

  this._models = [];
  this._rawOrQuery = [];
  this._arrayInput = _.isArray(modelsOrObjects);

  if (!this._arrayInput) {
    modelsOrObjects = _.isObject(modelsOrObjects) ? [modelsOrObjects] : [];
  }

  // Separate raw queries and query builders from other properties.
  // The other "normal" properties are converted into a Model instance
  // and the "query" properties are stored separately.
  _.each(modelsOrObjects, function (obj) {
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

      var model = self.ModelClass.fromJson(modelJson, modelOptions);
      self._models.push(model);
      self._rawOrQuery.push(rawOrSubquery);
    }
  });
};

InsertOrUpdate.prototype.toKnexInput = function () {
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

module.exports = InsertOrUpdate;
