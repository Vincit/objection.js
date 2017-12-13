'use strict';

const path = require('path');
const once = require('lodash/once');
const isSubclassOf = require('../utils/classUtils').isSubclassOf;
const getModel = once(() => require('../model/Model'));

function resolveModel(modelRef, modelPaths, errorPrefix) {
  const Model = getModel();

  if (isSubclassOf(modelRef, Model)) {
    // modelRef is already resolved to a Model subclass:
    return modelRef;
  } else if (typeof modelRef === 'function') {
    // modelRef should be a thunk (or no-argument function) that returns a
    // Model subclass:
    try {
      const fromThunk = modelRef();
      if (isSubclassOf(fromThunk, Model)) {
        return fromThunk;
      }
    } catch (err) {
      // modelRef isn't a thunk
    }
  } else if (typeof modelRef === 'string') {
    // modelRef should be a path to a module that will export a Model
    // subclass:
    const modulePath = modelRef;
    let ModelClass = null;

    if (isAbsolutePath(modulePath)) {
      ModelClass = requireModel(modulePath, errorPrefix);
    } else if (modelPaths) {
      modelPaths.forEach(modelPath => {
        if (ModelClass === null) {
          ModelClass = requireModel(path.join(modelPath, modulePath), errorPrefix);
        }
      });
    }

    if (!isSubclassOf(ModelClass, Model)) {
      throw new Error(`${errorPrefix}: ${modulePath} is an invalid file path to a model class`);
    }

    return ModelClass;
  }
  throw new Error(
    `${errorPrefix} must be either a subclass of Model, a thunk to a subclass of Model, or a file path to a module that exports one.`
  );
}

function requireModel(path, errorPrefix) {
  const Model = getModel();

  let mod = null;
  let ModelClass = null;

  try {
    mod = require(path);
  } catch (err) {
    return null;
  }

  if (isSubclassOf(mod, Model)) {
    ModelClass = mod;
  } else if (isSubclassOf(mod.default, Model)) {
    // Babel 6 style of exposing default export.
    ModelClass = mod.default;
  } else {
    Object.keys(mod).forEach(exportName => {
      const exp = mod[exportName];

      if (isSubclassOf(exp, Model)) {
        if (ModelClass !== null) {
          throw new Error(
            `${errorPrefix} path ${path} exports multiple models. Don't know which one to choose.`
          );
        }

        ModelClass = exp;
      }
    });
  }

  return ModelClass;
}

function isAbsolutePath(pth) {
  return path.normalize(pth + '/') === path.normalize(path.resolve(pth) + '/');
}

module.exports = {
  resolveModel
};
