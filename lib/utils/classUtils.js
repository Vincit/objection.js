'use strict';

function inherit(Constructor, BaseConstructor) {
  Constructor.prototype = Object.create(BaseConstructor.prototype);
  Constructor.prototype.constructor = BaseConstructor;
  Object.setPrototypeOf(Constructor, BaseConstructor);

  return Constructor;
}

module.exports = {
  inherit
};
