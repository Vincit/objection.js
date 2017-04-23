'use strict';

const cache = Object.create(null);

module.exports = (ModelClass) => {
  let inherit = cache[ModelClass.name];

  if (!inherit) {
    inherit = createClassInheritor(ModelClass.name);
    cache[ModelClass.name] = inherit;
  }

  return inherit(ModelClass);
};

function createClassInheritor(className) {
  return new Function('BaseClass', `
    'use strict';
    
    return class ${className} extends BaseClass {
    
    }
  `);
}



