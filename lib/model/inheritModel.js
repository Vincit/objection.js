const cache = new Map();

function inheritModel(modelClass) {
  let inherit = cache.get(modelClass.name);

  if (!inherit) {
    inherit = createClassInheritor(modelClass.name);
    cache.set(modelClass.name, inherit);
  }

  return inherit(modelClass);
}

function createClassInheritor(className) {
  return new Function(
    'BaseClass',
    `
    'use strict';
    return class ${className} extends BaseClass {}
  `
  );
}

module.exports = {
  inheritModel
};
