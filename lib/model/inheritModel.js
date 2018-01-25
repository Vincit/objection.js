const cache = new Map();

function inheritModel(ModelClass) {
  let inherit = cache.get(ModelClass.name);

  if (!inherit) {
    inherit = createClassInheritor(ModelClass.name);
    cache.set(ModelClass.name, inherit);
  }

  return inherit(ModelClass);
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
