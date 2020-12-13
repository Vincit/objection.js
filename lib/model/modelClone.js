'use strict';

const { isObject, cloneDeep } = require('../utils/objectUtils');
const { hiddenProps } = require('./modelUtils');
const { defineNonEnumerableProperty } = require('./modelUtils');
const { isInternalProp } = require('../utils/internalPropUtils');

function clone(model, shallow, stripInternal) {
  let clone = null;

  const omitFromJson = model.$omitFromJson();
  const omitFromDatabaseJson = model.$omitFromDatabaseJson();

  if (!shallow && !stripInternal) {
    clone = cloneSimple(model);
  } else {
    clone = cloneWithOpt(model, shallow, stripInternal);
  }

  if (omitFromJson) {
    clone.$omitFromJson(omitFromJson);
  }

  if (omitFromDatabaseJson) {
    clone.$omitFromDatabaseJson(omitFromDatabaseJson);
  }

  clone = copyHiddenProps(model, clone);
  return clone;
}

function cloneSimple(model) {
  const clone = new model.constructor();
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    if (isObject(value)) {
      clone[key] = cloneObject(value);
    } else {
      clone[key] = value;
    }
  }

  return clone;
}

function cloneWithOpt(model, shallow, stripInternal) {
  const clone = new model.constructor();
  const keys = Object.keys(model);
  const relationNames = model.constructor.getRelationNames();

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    if ((shallow && relationNames.includes(key)) || (stripInternal && isInternalProp(key))) {
      continue;
    }

    if (isObject(value)) {
      clone[key] = cloneObject(value);
    } else {
      clone[key] = value;
    }
  }

  return clone;
}

function cloneObject(value) {
  if (Array.isArray(value)) {
    return cloneArray(value);
  } else if (value.$isObjectionModel) {
    return clone(value, false, false);
  } else if (Buffer.isBuffer(value)) {
    return new Buffer(value);
  } else {
    return cloneDeep(value);
  }
}

function cloneArray(value) {
  const ret = new Array(value.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    const item = value[i];

    if (isObject(item)) {
      ret[i] = cloneObject(item);
    } else {
      ret[i] = item;
    }
  }

  return ret;
}

function copyHiddenProps(model, clone) {
  for (let i = 0, l = hiddenProps.length; i < l; ++i) {
    const prop = hiddenProps[i];

    if (model.hasOwnProperty(prop)) {
      defineNonEnumerableProperty(clone, prop, model[prop]);
    }
  }

  return clone;
}

module.exports = {
  clone,
};
