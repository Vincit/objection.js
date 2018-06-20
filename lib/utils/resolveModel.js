const path = require('path');
const once = require('../utils/objectUtils').once;
const getModel = once(() => require('../model/Model'));

const { isSubclassOf } = require('../utils/classUtils');

function resolveModel(modelRef, modelPaths, errorPrefix) {
  const Model = getModel();

  if (typeof modelRef === 'string') {
    const modulePath = modelRef;
    let modelClass = null;

    if (isAbsolutePath(modulePath)) {
      modelClass = requireModel(modulePath, errorPrefix);
    } else if (modelPaths) {
      modelPaths.forEach(modelPath => {
        if (modelClass === null) {
          modelClass = requireModel(path.join(modelPath, modulePath), errorPrefix);
        }
      });
    }

    if (!isSubclassOf(modelClass, Model)) {
      throw new Error(`${errorPrefix}: ${modulePath} is an invalid file path to a model class`);
    }

    return modelClass;
  } else {
    if (!isSubclassOf(modelRef, Model)) {
      throw new Error(
        `${errorPrefix} is not a subclass of Model or a file path to a module that exports one. You may be dealing with a require loop. See the documentation section about require loops.`
      );
    }

    return modelRef;
  }
}

function requireModel(path, errorPrefix) {
  const Model = getModel();

  let mod = require(path);
  let modelClass = null;

  if (isSubclassOf(mod, Model)) {
    modelClass = mod;
  } else if (isSubclassOf(mod.default, Model)) {
    // Babel 6 style of exposing default export.
    modelClass = mod.default;
  } else {
    Object.keys(mod).forEach(exportName => {
      const exp = mod[exportName];

      if (isSubclassOf(exp, Model)) {
        if (modelClass !== null) {
          throw new Error(
            `${errorPrefix} path ${path} exports multiple models. Don't know which one to choose.`
          );
        }

        modelClass = exp;
      }
    });
  }

  return modelClass;
}

function isAbsolutePath(pth) {
  return path.normalize(pth + '/') === path.normalize(path.resolve(pth) + '/');
}

module.exports = {
  resolveModel
};
