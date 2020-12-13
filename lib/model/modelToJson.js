'use strict';

const { isInternalProp } = require('../utils/internalPropUtils');
const { mergeQueryProps } = require('./modelQueryProps');
const { isObject, cloneDeep, isFunction } = require('../utils/objectUtils');
const EMPTY_ARRAY = [];

function toJson(model, optIn) {
  const modelClass = model.constructor;

  const opt = {
    virtuals: getVirtuals(optIn),
    shallow: isShallow(optIn),
    omit: getOmit(optIn, modelClass),
    pick: null,
    omitFromJson: model.$omitFromJson() || null,
    cloneObjects: modelClass.cloneObjectAttributes,
  };

  let json = toExternalJsonImpl(model, opt);
  json = model.$formatJson(json);

  return json;
}

function toDatabaseJson(model, builder) {
  const modelClass = model.constructor;

  const opt = {
    virtuals: false,
    shallow: true,
    omit: modelClass.getRelationNames(),
    pick: getPick(modelClass),
    omitFromJson: model.$omitFromDatabaseJson() || null,
    cloneObjects: modelClass.cloneObjectAttributes,
  };

  let json = toDatabaseJsonImpl(model, opt);
  json = model.$formatDatabaseJson(json);

  return mergeQueryProps(model, json, opt.omitFromJson, builder);
}

function getVirtuals(opt) {
  if (!opt) {
    return true;
  } else if (Array.isArray(opt.virtuals)) {
    return opt.virtuals;
  } else {
    return opt.virtuals !== false;
  }
}

function isShallow(opt) {
  return !!opt && !!opt.shallow;
}

function getOmit(opt, modelClass) {
  return isShallow(opt) ? modelClass.getRelationNames() : null;
}

function getPick(modelClass) {
  const jsonSchema = modelClass.getJsonSchema();
  return (jsonSchema && modelClass.pickJsonSchemaProperties && jsonSchema.properties) || null;
}

function toExternalJsonImpl(model, opt) {
  const json = {};
  const keys = Object.keys(model);
  const vAttr = getVirtualAttributes(model, opt);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    assignJsonValue(json, key, value, opt);
  }

  if (vAttr.length !== 0) {
    assignVirtualAttributes(json, model, vAttr, opt);
  }

  return json;
}

function getVirtualAttributes(model, opt) {
  if (Array.isArray(opt.virtuals)) {
    return opt.virtuals;
  } else if (opt.virtuals === true) {
    return model.constructor.getVirtualAttributes();
  } else {
    return EMPTY_ARRAY;
  }
}

function toDatabaseJsonImpl(model, opt) {
  const json = {};
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    assignJsonValue(json, key, value, opt);
  }

  return json;
}

function assignJsonValue(json, key, value, opt) {
  const type = typeof value;

  if (
    type !== 'function' &&
    type !== 'undefined' &&
    !isInternalProp(key) &&
    !shouldOmit(opt, key) &&
    shouldPick(opt, key)
  ) {
    if (isObject(value)) {
      json[key] = toJsonObject(value, opt);
    } else {
      json[key] = value;
    }
  }
}

function shouldOmit(opt, key) {
  return (
    (opt.omit !== null && opt.omit.includes(key)) ||
    (opt.omitFromJson !== null && opt.omitFromJson.includes(key))
  );
}

function shouldPick(opt, key) {
  return opt.pick === null || key in opt.pick;
}

function assignVirtualAttributes(json, model, vAttr, opt) {
  for (let i = 0, l = vAttr.length; i < l; ++i) {
    const key = vAttr[i];
    let value = model[key];

    if (isFunction(value)) {
      value = value.call(model);
    }

    assignJsonValue(json, key, value, opt);
  }
}

function toJsonObject(value, opt) {
  if (Array.isArray(value)) {
    return toJsonArray(value, opt);
  } else if (value.$isObjectionModel) {
    // No branch for $toDatabaseJson here since there is never a need
    // to have nested models in database rows.
    return value.$toJson(opt);
  } else if (Buffer.isBuffer(value)) {
    return value;
  } else if (opt.cloneObjects) {
    return cloneDeep(value);
  } else {
    return value;
  }
}

function toJsonArray(value, opt) {
  const ret = new Array(value.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    const item = value[i];

    if (isObject(item)) {
      ret[i] = toJsonObject(item, opt);
    } else {
      ret[i] = item;
    }
  }

  return ret;
}

module.exports = {
  toJson,
  toDatabaseJson,
};
