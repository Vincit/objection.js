'use strict';

const isKnexRaw = require('../utils/knexUtils').isKnexRaw;
const isKnexQueryBuilder = require('../utils/knexUtils').isKnexQueryBuilder;
const defineNonEnumerableProperty = require('./modelUtils').defineNonEnumerableProperty;
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

  if (!json.$isObjectionModel) {
    // json can contain "query properties" like `raw` instances, query builders etc.
    // We take them out of `json` and store them to a hidden property $$queryProps
    // in the model instance for later use.
    json = splitQueryProps(model, json);
  }

  json = model.$parseJson(json, options);
  json = model.$validate(json, options);

  model.$set(json);

  if (!options.skipParseRelations) {
    parseRelationsIntoModelInstances(model, json, options);
  }

  return model;
}

function splitQueryProps(model, json) {
  const keys = Object.keys(json);
  let hasQueryProps = false;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = json[key];

    if (isQueryProp(value)) {
      hasQueryProps = true;
      break;
    }
  }

  if (hasQueryProps) {
    const queryProps = {};
    const modelProps = {};

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const value = json[key];

      if (isQueryProp(value)) {
        queryProps[key] = value;
      } else {
        modelProps[key] = value;
      }
    }

    defineNonEnumerableProperty(model, '$$queryProps', queryProps);
    return modelProps;
  } else {
    return json;
  }
}

function isQueryProp(value) {
  if (!value) {
    return false;
  }

  return (
    isKnexQueryBuilder(value) ||
    isKnexRaw(value) ||
    value.isObjectionQueryBuilderBase ||
    typeof value.toKnexRaw === 'function'
  );
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

function setRelated(model, relation, models) {
  relation = ensureRelation(model, relation);

  if (relation.isOneToOne()) {
    if (Array.isArray(models)) {
      if (models.length === 0) {
        model[relation.name] = null;
      } else {
        model[relation.name] = models[0] || null;
      }
    } else {
      model[relation.name] = models || null;
    }
  } else {
    if (!models) {
      model[relation.name] = [];
    } else if (Array.isArray(models)) {
      model[relation.name] = models;
    } else {
      model[relation.name] = [models];
    }
  }

  return this;
}

function appendRelated(model, relation, models) {
  relation = ensureRelation(model, relation);

  if (!model[relation.name] || relation.isOneToOne()) {
    return model.$setRelated(relation, models);
  } else {
    if (Array.isArray(models)) {
      models.forEach(it => model[relation.name].push(it));
    } else if (models) {
      model[relation.name].push(models);
    }
  }

  return this;
}

function ensureRelation(model, relation) {
  if (typeof relation === 'string') {
    relation = model.constructor.getRelation(relation);
  } else {
    return relation;
  }
}

module.exports = {
  setFast,
  setJson,
  setDatabaseJson,
  setRelated,
  appendRelated
};
