'use strict';

const cloneDeep = require('lodash/cloneDeep');

function toJson(model, shallow) {
  const ModelClass = model.constructor;
  const omit = (shallow && ModelClass.getRelations()) || null;
  const json = toExternalJsonImpl(model, omit, null);

  return model.$formatJson(json);
}

function toDatabaseJson(model, knex) {
  const ModelClass = model.constructor;
  const jsonSchema = ModelClass.getJsonSchema();
  const pick = (jsonSchema && ModelClass.pickJsonSchemaProperties && jsonSchema.properties) || null;

  let json = null;

  json = toDatabaseJsonImpl(model, ModelClass.getRelations(), pick);
  json = model.$formatDatabaseJson(json);

  return mergeQueryProps(model, json, knex);
}

function toDatabaseJsonImpl(model, omit, pick) {
  const json = {};
  const omitFromJson = model.$omitFromDatabaseJson() || null;
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    assignJsonValue(json, key, value, omit, pick, omitFromJson);
  }

  return json;
}

function toExternalJsonImpl(model, omit, pick) {
  const json = {};
  const omitFromJson = model.$omitFromJson() || null;
  const keys = Object.keys(model);
  const vAttr = model.constructor.virtualAttributes;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    assignJsonValue(json, key, value, omit, pick, omitFromJson);
  }

  if (vAttr) {
    assignVirtualAttributes(json, model, vAttr, omit, pick, omitFromJson);
  }

  return json;
}

function assignJsonValue(json, key, value, omit, pick, omitFromJson) {
  const type = typeof value;

  if (
    (omit === null || !(key in omit)) &&
    (pick === null || key in pick) &&
    (omitFromJson === null || omitFromJson.indexOf(key) === -1) &&
    type !== 'function' &&
    type !== 'undefined' &&
    key[0] !== '$'
  ) {
    if (value !== null && type === 'object') {
      json[key] = toJsonObject(value);
    } else {
      json[key] = value;
    }
  }
}

function assignVirtualAttributes(json, model, vAttr, omit, pick, omitFromJson) {
  for (let i = 0, l = vAttr.length; i < l; ++i) {
    const key = vAttr[i];
    let value = model[key];

    if (typeof value === 'function') {
      value = value.call(model);
    }

    assignJsonValue(json, key, value, omit, pick, omitFromJson);
  }
}

function toJsonObject(value) {
  if (Array.isArray(value)) {
    return toJsonArray(value);
  } else if (value && value.$isObjectionModel) {
    // No branch for $toDatabaseJson here since there is never a need
    // to have nested models in database rows.
    return value.$toJson();
  } else if (Buffer.isBuffer(value)) {
    return value;
  } else {
    return cloneDeep(value);
  }
}

function toJsonArray(value) {
  const ret = new Array(value.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    ret[i] = toJsonObject(value[i]);
  }

  return ret;
}

function mergeQueryProps(model, json, knex) {
  if (!model.$$queryProps) {
    return json;
  }

  const modelClass = model.constructor;
  const keys = Object.keys(model.$$queryProps);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    let queryProp = model.$$queryProps[key];

    if (queryProp) {
      if (queryProp.isObjectionQueryBuilderBase) {
        queryProp = queryProp.build();
      } else if (typeof queryProp.toKnexRaw === 'function') {
        if (!knex) {
          throw new Error(
            'toDatabaseJson called without a knex instance for a model with query properties'
          );
        }
        queryProp = queryProp.toKnexRaw(knex);
      }
    }

    json[modelClass.propertyNameToColumnName(key)] = queryProp;
  }

  return json;
}

module.exports = {
  toJson,
  toDatabaseJson
};
