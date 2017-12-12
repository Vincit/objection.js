'use strict';

function isSubclassOf(Constructor, SuperConstructor) {
  if (typeof SuperConstructor !== 'function') {
    return false;
  }

  while (typeof Constructor === 'function') {
    if (Constructor === SuperConstructor) {
      return true;
    }

    // __proto__ is deprecated (see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/proto)
    // .getPrototypeOf is supported by node >= 4 (SEE http://kangax.github.io/compat-table/es5/#test-Object.getPrototypeOf)
    let proto = Constructor.prototype && Object.getPrototypeOf(Constructor.prototype);
    Constructor = proto && proto.constructor;
  }

  return false;
}

module.exports = {
  isSubclassOf
};
