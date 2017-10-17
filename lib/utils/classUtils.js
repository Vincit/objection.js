'use strict';

function isSubclassOf(Constructor, SuperConstructor) {
  if (typeof SuperConstructor !== 'function') {
    return false;
  }

  while (typeof Constructor === 'function') {
    if (Constructor === SuperConstructor) {
      return true;
    }

    let proto = Constructor.prototype.__proto__;
    Constructor = proto && proto.constructor;
  }

  return false;
}

module.exports = {
  isSubclassOf
};
