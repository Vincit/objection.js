'use strict';

module.exports = function (ModelClass) {
  class SubClass extends ModelClass {}
  return SubClass;
};
