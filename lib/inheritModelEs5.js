'use strict';

module.exports = function (ModelClass) {
  var BoundModelClass = function BoundModelClass() {
    ModelClass.apply(this, arguments);
  };

  ModelClass.extend(BoundModelClass);
  return BoundModelClass;
};

