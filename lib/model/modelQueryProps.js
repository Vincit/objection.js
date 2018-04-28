const { isObject } = require('../utils/objectUtils');
const { defineNonEnumerableProperty } = require('./modelUtils');
const { isKnexRaw, isKnexQueryBuilder } = require('../utils/knexUtils');

const QUERY_PROPS_PROPERTY = '$$queryProps';

// Removes query properties from `json` and stores them into a hidden property
// inside `model` so that they can be later merged back to `json`.
function splitQueryProps(model, json) {
  const keys = Object.keys(json);

  if (hasQueryProps(json, keys)) {
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

    defineNonEnumerableProperty(model, QUERY_PROPS_PROPERTY, queryProps);

    return modelProps;
  } else {
    return json;
  }
}

function hasQueryProps(json, keys) {
  for (let i = 0, l = keys.length; i < l; ++i) {
    if (isQueryProp(json[keys[i]])) {
      return true;
    }
  }

  return false;
}

function isQueryProp(value) {
  if (!isObject(value)) {
    return false;
  }

  return (
    isKnexQueryBuilder(value) ||
    isKnexRaw(value) ||
    value.isObjectionQueryBuilderBase ||
    typeof value.toKnexRaw === 'function'
  );
}

// Merges and converts `model`'s query properties into `json`.
function mergeQueryProps(model, json, knex) {
  json = convertExistingQueryProps(json, knex);
  json = convertAndMergeHiddenQueryProps(model, json, knex);

  return json;
}

// Converts the query properties in `json` to knex raw instances.
// `json` may have query properties even though we removed them.
// For example they may have been added in lifecycle hooks.
function convertExistingQueryProps(json, knex) {
  const keys = Object.keys(json);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = json[key];

    if (isQueryProp(value)) {
      json[key] = queryPropToKnexRaw(value, knex);
    }
  }

  return json;
}

// Converts and merges the query props that were split from the model
// and stored into QUERY_PROPS_PROPERTY.
function convertAndMergeHiddenQueryProps(model, json, knex) {
  const queryProps = model[QUERY_PROPS_PROPERTY];

  if (!queryProps) {
    // The model has no query properties.
    return json;
  }

  const modelClass = model.constructor;
  const keys = Object.keys(queryProps);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const queryProp = queryPropToKnexRaw(queryProps[key], knex);

    json[modelClass.propertyNameToColumnName(key)] = queryProp;
  }

  return json;
}

// Converts a query property into a knex `raw` instance.
function queryPropToKnexRaw(queryProp, knex) {
  if (!queryProp) {
    return queryProp;
  }

  if (queryProp.isObjectionQueryBuilderBase) {
    return buildObjectionQueryBuilder(queryProp);
  } else if (isKnexRawConvertable(queryProp)) {
    return buildKnexRawConvertable(queryProp, knex);
  } else {
    return queryProp;
  }
}

function buildObjectionQueryBuilder(builder) {
  return builder.build();
}

function buildKnexRawConvertable(converable, knex) {
  if (!knex) {
    throw new Error(
      'toDatabaseJson called without a knex instance for a model with query properties'
    );
  }

  return converable.toKnexRaw(knex);
}

function isKnexRawConvertable(queryProp) {
  return typeof queryProp.toKnexRaw === 'function';
}

module.exports = {
  splitQueryProps,
  mergeQueryProps
};
