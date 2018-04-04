const cloneDeep = require('lodash/cloneDeep');

function toJson(model, opt) {
  const modelClass = model.constructor;

  opt = Object.assign(
    {
      virtuals: true,
      shallow: false
    },
    opt
  );

  opt.omit = null;
  opt.pick = null;
  opt.omitFromJson = null;

  if (opt.shallow) {
    opt.omit = modelClass.getRelations();
  }

  let json = toExternalJsonImpl(model, opt);
  return model.$formatJson(json);
}

function toDatabaseJson(model, knex) {
  const modelClass = model.constructor;
  const jsonSchema = modelClass.getJsonSchema();

  const opt = {
    virtuals: false,
    shallow: true,
    omit: modelClass.getRelations(),
    pick: (jsonSchema && modelClass.pickJsonSchemaProperties && jsonSchema.properties) || null,
    omitFromJson: null
  };

  let json = toDatabaseJsonImpl(model, opt);
  json = model.$formatDatabaseJson(json);

  return mergeQueryProps(model, json, knex);
}

function toExternalJsonImpl(model, opt) {
  const json = {};
  const keys = Object.keys(model);
  const vAttr = model.constructor.virtualAttributes;

  opt.omitFromJson = model.$omitFromJson() || null;

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

  opt.omitFromJson = model.$omitFromDatabaseJson() || null;

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
    if (value !== null && type === 'object') {
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

    if (typeof value === 'function') {
      value = value.call(model);
    }

    assignJsonValue(json, key, value, opt);
  }
}

function toJsonObject(value, opt) {
  if (Array.isArray(value)) {
    return toJsonArray(value, opt);
  } else if (value && value.$isObjectionModel) {
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
    ret[i] = toJsonObject(value[i], opt);
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
