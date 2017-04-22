const cache = Object.create(null);
let createInheritor;

if (isClassKeywordSupported()) {
  createInheritor = createClassInheritor;
} else {
  createInheritor = createFunctionInheritor;
}

module.exports = (ModelClass) => {
  let inherit = cache[ModelClass.name];

  if (!inherit) {
    inherit = createInheritor(ModelClass.name);
    cache[ModelClass.name] = inherit;
  }

  return inherit(ModelClass);
};

function createFunctionInheritor(className) {
  return new Function('BaseClass', `
    function ${className}() { 
      BaseClass.apply(this, arguments); 
    }
    
    BaseClass.extend(${className});
    return ${className};
  `);
}

function createClassInheritor(className) {
  return new Function('BaseClass', `
    return class ${className} extends BaseClass {
    
    }
  `);
}

function isClassKeywordSupported() {
  try {
    createClassInheritor('Test');
    return true;
  } catch (err) {
    return false;
  }
}



