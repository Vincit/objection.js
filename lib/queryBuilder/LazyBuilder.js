'use strict';

class LazyBuilder {
  build(/* istanbul ignore next */ knex) {
    throw new Error('not implemented');
  }
}

Object.defineProperties(LazyBuilder.prototype, {
  isObjectionLazyBuilder: {
    enumerable: false,
    writable: false,
    value: true
  }
});

module.exports = {
  LazyBuilder
};
