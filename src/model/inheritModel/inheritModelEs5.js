'use strict';

module.exports = function (ModelClass) {
  function AnonymousModelSubclass() {
    ModelClass.apply(this, arguments);
  }

  ModelClass.extend(AnonymousModelSubclass);
  return AnonymousModelSubclass;
};

