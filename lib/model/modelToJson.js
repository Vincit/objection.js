'use strict';

const cloneDeep = require('lodash/cloneDeep'); 

function $toJson(shallow) {
  const ModelClass = this.constructor;

  if (shallow) {
    return modelToJson(this, false, ModelClass.getRelations(), null);
  } else {
    return modelToJson(this, false, null, null);
  }
}

function $toDatabaseJson() {
  const ModelClass = this.constructor;
  const jsonSchema = ModelClass.getJsonSchema();

  if (jsonSchema && ModelClass.pickJsonSchemaProperties) {
    return modelToJson(this, true, null, jsonSchema.properties);
  } else {
    return modelToJson(this, true, ModelClass.getRelations(), null);
  }
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

  if (key.charAt(0) !== '$'
    && type !== 'function'
    && type !== 'undefined'
    && (!omit || !omit[key])
    && (!pick || pick[key])
    && (!omitFromJson || !contains(omitFromJson, key))) {

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
    ret[i] = toJsonObject(value[i], createDbJson)
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

module.exports = {
  $toJson,
  $toDatabaseJson
};