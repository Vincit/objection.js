'use strict';

const _ = require('lodash');

function inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  if (superClass) {
    subClass.__proto__ = superClass;
  }

  return subClass;
}

function isSubclassOf(Constructor, SuperConstructor) {
  if (!_.isFunction(SuperConstructor)) {
    return false;
  }

  while (_.isFunction(Constructor)) {
    if (Constructor === SuperConstructor) return true;
    let proto = Constructor.prototype.__proto__;
    Constructor = proto && proto.constructor;
  }

  return false;
}

module.exports = {
  inherits: inherits,
  isSubclassOf: isSubclassOf
};

