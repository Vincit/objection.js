'use strict';

function $omit() {
  if (arguments.length === 1 && arguments[0] && typeof arguments[0] === 'object') {
    const keys = arguments[0];

    if (Array.isArray(keys)) {
      omitArray(this, keys);
    } else {
      omitObject(this, keys);
    }
  } else {
    const keys = new Array(arguments.length);

    for (let i = 0, l = keys.length; i < l; ++i) {
      keys[i] = arguments[i];
    }

    omitArray(this, keys);
  }

  return this;
}

function $pick() {
  if (arguments.length === 1 && arguments[0] && typeof arguments[0] === 'object') {
    const keys = arguments[0];

    if (Array.isArray(keys)) {
      pickArray(this, keys);
    } else {
      pickObject(this, keys);
    }
  } else {
    const keys = new Array(arguments.length);

    for (let i = 0, l = keys.length; i < l; ++i) {
      keys[i] = arguments[i];
    }

    pickArray(this, keys);
  }

  return this;
}

function omitObject(model, keyObj) {
  const ModelClass = model.constructor;
  const keys = Object.keys(keyObj);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = keyObj[key];

    if (value && key.charAt(0) !== '$' && model.hasOwnProperty(key)) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function omitArray(model, keys) {
  const ModelClass = model.constructor;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && model.hasOwnProperty(key)) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function pickObject(model, keyObj) {
  const ModelClass = model.constructor;
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && !keyObj[key]) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function pickArray(model, pick) {
  const ModelClass = model.constructor;
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && !contains(pick, key)) {
      ModelClass.omitImpl(model, key);
    }
  }
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
  $omit,
  $pick
};