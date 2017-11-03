'use strict';

const parseRelationsIntoModelInstances = require('./modelParseRelations')
  .parseRelationsIntoModelInstances;

function setJson(model, json, options) {
  json = json || {};
  options = options || {};

  if (Object.prototype.toString.call(json) !== '[object Object]') {
    throw new Error(
      'You should only pass objects to $setJson method. ' +
        '$setJson method was given an invalid value ' +
        json
    );
  }

  json = model.$parseJson(json, options);
  json = model.$validate(json, options);
  model.$set(json);

  if (!options.skipParseRelations) {
    parseRelationsIntoModelInstances(model, json, options);
  }
}

function setDatabaseJson(model, json) {
  json = model.$parseDatabaseJson(json);

  if (json) {
    const keys = Object.keys(json);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      model[key] = json[key];
    }
  }

  return model;
}

function setFast(model, obj) {
  if (obj) {
    // Don't try to set read-only virtual properties. They can easily get here through `fromJson`
    // when parsing an object that was previously serialized from a model instance.
    const readOnlyVirtuals = model.constructor.getReadOnlyVirtualAttributes();
    const keys = Object.keys(obj);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const value = obj[key];

      if (
        key.charAt(0) !== '$' &&
        typeof value !== 'function' &&
        (readOnlyVirtuals === null || readOnlyVirtuals.indexOf(key) === -1)
      ) {
        model[key] = value;
      }
    }
  }

  return model;
}

module.exports = {
  setFast,
  setJson,
  setDatabaseJson
};
