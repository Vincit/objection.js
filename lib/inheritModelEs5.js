'use strict';

module.exports = function (ModelClass) {
  var SubClass = function SubClass() {
    ModelClass.apply(this, arguments);
  };

  ModelClass.extend(SubClass);
  return SubClass;
};

