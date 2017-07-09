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
    // Don't try to set read-only virtual properties. They can easily get here through `fromJson`
    // when parsing an object that was previously serialized from a model instance.
    const readOnlyVirtuals = this.constructor.getReadOnlyVirtualAttributes();
    const keys = Object.keys(obj);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const value = obj[key];

      if (key.charAt(0) !== '$'
          && typeof value !== 'function'
          && (readOnlyVirtuals === null || readOnlyVirtuals.indexOf(key) === -1)) {

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