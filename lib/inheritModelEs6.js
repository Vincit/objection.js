'use strict';

module.exports = function (ModelClass) {
  class BoundModelClass extends ModelClass {}
  return BoundModelClass;
};
