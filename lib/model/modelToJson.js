const { mergeQueryProps } = require('./modelQueryProps');
const { isObject, cloneDeep, isFunction } = require('../utils/objectUtils');

function toJson(model, opt) {
  const modelClass = model.constructor;

  if (!isObject(opt)) {
    opt = {};
  }

  // We don't take a copy of `opt` here which can cause some problems in some
  // super rare cases since we modify an object passed from the outside. I can't
  // think of a realistic scenario where this would actually have some unwanted
  // effects. We don't take a copy for performance reasons.
  opt.omit = null;
  opt.pick = null;
  opt.omitFromJson = model.$omitFromJson() || null;

  if (opt.virtuals === undefined) {
    opt.virtuals = true;
  }

  if (opt.shallow) {
    opt.omit = modelClass.getRelations();
  }

  const json = toExternalJsonImpl(model, opt);

  return model.$formatJson(json);
}

function toDatabaseJson(model, builder) {
  const modelClass = model.constructor;
  const jsonSchema = modelClass.getJsonSchema();

  const opt = {
    virtuals: false,
    shallow: true,
    omit: modelClass.getRelations(),
    pick: (jsonSchema && modelClass.pickJsonSchemaProperties && jsonSchema.properties) || null,
    omitFromJson: model.$omitFromDatabaseJson() || null
  };

  let json = toDatabaseJsonImpl(model, opt);
  json = model.$formatDatabaseJson(json);

  return mergeQueryProps(model, json, builder);
}

function toExternalJsonImpl(model, opt) {
  const json = {};
  const keys = Object.keys(model);
  const vAttr = model.constructor.virtualAttributes;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    assignJsonValue(json, key, value, opt);
  }

  if (vAttr && opt.virtuals === true) {
    assignVirtualAttributes(json, model, vAttr, opt);
  }

  return json;
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
    (opt.omit === null || !(key in opt.omit)) &&
    (opt.pick === null || key in opt.pick) &&
    (opt.omitFromJson === null || opt.omitFromJson.indexOf(key) === -1) &&
    type !== 'function' &&
    type !== 'undefined' &&
    key[0] !== '$'
  ) {
    if (isObject(value)) {
      json[key] = toJsonObject(value, opt);
    } else {
      json[key] = value;
    }
  }
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
  } else {
    return cloneDeep(value);
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
  toDatabaseJson
};
