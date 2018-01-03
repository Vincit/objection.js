'use strict';

const cloneDeep = require('lodash/cloneDeep');
const hiddenProps = require('./modelUtils').hiddenProps;
const defineNonEnumerableProperty = require('./modelUtils').defineNonEnumerableProperty;

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

    if (value !== null && typeof value === 'object') {
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
  const relations = model.constructor.getRelations();

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = model[key];

    if (shallow && relations[key]) {
      continue;
    }

    if (stripInternal && key.charAt(0) === '$') {
      continue;
    }

    if (value !== null && typeof value === 'object') {
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
  } else if (value && value.$isObjectionModel) {
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
    ret[i] = cloneObject(value[i]);
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
  clone
};
