'use strict';

function omit(model, args) {
  if (args.length === 1 && args[0] && typeof args[0] === 'object') {
    const keys = args[0];

    if (Array.isArray(keys)) {
      omitArray(model, keys);
    } else {
      omitObject(model, keys);
    }
  } else {
    const keys = new Array(args.length);

    for (let i = 0, l = keys.length; i < l; ++i) {
      keys[i] = args[i];
    }

    omitArray(model, keys);
  }

  return model;
}

function pick(model, args) {
  if (args.length === 1 && args[0] && typeof args[0] === 'object') {
    const keys = args[0];

    if (Array.isArray(keys)) {
      pickArray(model, keys);
    } else {
      pickObject(model, keys);
    }
  } else {
    const keys = new Array(args.length);

    for (let i = 0, l = keys.length; i < l; ++i) {
      keys[i] = args[i];
    }

    pickArray(model, keys);
  }

  return model;
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
  omit,
  pick
};
