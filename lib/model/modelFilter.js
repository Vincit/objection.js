const { isObject } = require('../utils/objectUtils');

function omit(model, args) {
  if (args.length === 1 && isObject(args[0])) {
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
  if (args.length === 1 && isObject(args[0])) {
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
  const modelClass = model.constructor;
  const keys = Object.keys(keyObj);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = keyObj[key];

    if (value && key.charAt(0) !== '$' && model.hasOwnProperty(key)) {
      modelClass.omitImpl(model, key);
    }
  }
}

function omitArray(model, keys) {
  const modelClass = model.constructor;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && model.hasOwnProperty(key)) {
      modelClass.omitImpl(model, key);
    }
  }
}

function pickObject(model, keyObj) {
  const modelClass = model.constructor;
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && !keyObj[key]) {
      modelClass.omitImpl(model, key);
    }
  }
}

function pickArray(model, pick) {
  const modelClass = model.constructor;
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && !contains(pick, key)) {
      modelClass.omitImpl(model, key);
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
