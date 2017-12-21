'use strict';

const cloneDeep = require('lodash/cloneDeep');

function toJson(model, shallow) {
  const ModelClass = model.constructor;

  if (shallow) {
    return modelToJson(model, false, ModelClass.getRelations(), null);
  } else {
    return modelToJson(model, false, null, null);
  }
}

function toDatabaseJson(model, knex) {
  const ModelClass = model.constructor;
  const jsonSchema = ModelClass.getJsonSchema();
  const pick = jsonSchema && ModelClass.pickJsonSchemaProperties && jsonSchema.properties;
  const json = modelToJson(model, true, ModelClass.getRelations(), pick);

  return mergeQueryProps(model, json, knex);
}

function modelToJson(model, createDbJson, omit, pick) {
  const json = toJsonImpl(model, createDbJson, omit, pick);

  if (createDbJson) {
    return model.$formatDatabaseJson(json);
  } else {
    return model.$formatJson(json);
  }
}

function toJsonImpl(model, createDbJson, omit, pick) {
  if (createDbJson) {
    return toDatabaseJsonImpl(model, omit, pick);
  } else {
    return toExternalJsonImpl(model, omit, pick);
  }
}

function toDatabaseJsonImpl(model, omit, pick) {
  const json = {};
  const omitFromJson = model.$omitFromDatabaseJson();
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    assignJsonValue(json, key, model[key], omit, pick, omitFromJson, true);
  }

  return json;
}

function toExternalJsonImpl(model, omit, pick) {
  const json = {};
  const omitFromJson = model.$omitFromJson();
  const keys = Object.keys(model);
  const vAttr = model.constructor.virtualAttributes;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    assignJsonValue(json, key, value, omit, pick, omitFromJson, false);
  }

  if (vAttr) {
    assignVirtualAttributes(json, model, vAttr, omit, pick, omitFromJson);
  }

  return json;
}

function assignVirtualAttributes(json, model, vAttr, omit, pick, omitFromJson) {
  for (let i = 0, l = vAttr.length; i < l; ++i) {
    const key = vAttr[i];
    let value = model[key];

    if (typeof value === 'function') {
      value = value.call(model);
    }

    assignJsonValue(json, key, value, omit, pick, omitFromJson, false);
  }
}

function assignJsonValue(json, key, value, omit, pick, omitFromJson, createDbJson) {
  const type = typeof value;

  if (
    key.charAt(0) !== '$' &&
    type !== 'function' &&
    type !== 'undefined' &&
    (!omit || !omit[key]) &&
    (!pick || pick[key]) &&
    (!omitFromJson || !contains(omitFromJson, key))
  ) {
    if (value !== null && type === 'object') {
      json[key] = toJsonObject(value, createDbJson);
    } else {
      json[key] = value;
    }
  }
}

function toJsonObject(value, createDbJson) {
  if (Array.isArray(value)) {
    return toJsonArray(value, createDbJson);
  } else if (value && value.$isObjectionModel) {
    if (createDbJson) {
      return value.$toDatabaseJson();
    } else {
      return value.$toJson();
    }
  } else if (Buffer.isBuffer(value)) {
    return value;
  } else {
    return cloneDeep(value);
  }
}

function toJsonArray(value, createDbJson) {
  const ret = new Array(value.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    ret[i] = toJsonObject(value[i], createDbJson);
  }

  return ret;
}

function contains(arr, value) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    if (arr[i] === value) {
      return true;
    }
  }

  return false;
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
