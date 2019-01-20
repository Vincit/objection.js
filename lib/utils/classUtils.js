'use strict';

const { isFunction } = require('./objectUtils');

function isSubclassOf(Constructor, SuperConstructor) {
  if (!isFunction(SuperConstructor)) {
    return false;
  }

  while (isFunction(Constructor)) {
    if (Constructor === SuperConstructor) {
      return true;
    }

    Constructor = Object.getPrototypeOf(Constructor);
  }

  return false;
}

function inherit(Constructor, BaseConstructor) {
  Constructor.prototype = Object.create(BaseConstructor.prototype);
  Constructor.prototype.constructor = BaseConstructor;
  Object.setPrototypeOf(Constructor, BaseConstructor);

  return Constructor;
}

module.exports = {
  isSubclassOf,
  inherit
};
