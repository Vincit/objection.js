'use strict';

const parseRelationsIntoModelInstances = require('./modelParseRelations').parseRelationsIntoModelInstances;

function $setJson(json, options) {
  json = json || {};
  options = options || {};

  if (Object.prototype.toString.call(json) !== '[object Object]') {
    throw new Error('You should only pass objects to $setJson method. '
      + '$setJson method was given an invalid value '
      + json);
  }

  json = this.$parseJson(json, options);
  json = this.$validate(json, options);
  this.$set(json);

  if (!options.skipParseRelations) {
    parseRelationsIntoModelInstances(this, json, options);
  }
}

function $setDatabaseJson(json) {
  json = this.$parseDatabaseJson(json);

  if (json) {
    const keys = Object.keys(json);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      this[key] = json[key];
    }
  }

  return this;
}

function $set(obj) {
  if (obj) {
    const keys = Object.keys(obj);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const value = obj[key];

      if (key.charAt(0) !== '$' && typeof value !== 'function') {
        this[key] = value;
      }
    }
  }

  return this;
}

module.exports = {
  $set,
  $setJson,
  $setDatabaseJson
};