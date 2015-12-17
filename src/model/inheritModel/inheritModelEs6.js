'use strict';

module.exports = function (ModelClass) {
  class AnonymousModelSubclass extends ModelClass {}
  return AnonymousModelSubclass;
};
