const path = require('path');
const once = require('../utils/objectUtils').once;
const getModel = once(() => require('../model/Model'));

const { isSubclassOf } = require('../utils/classUtils');

function resolveModel(modelRef, modelPaths, errorPrefix) {
  const Model = getModel();

  if (typeof modelRef === 'string') {
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
