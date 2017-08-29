'use strict';

class LazyBuilder {

  get isObjectionLazyBuilder() {
    return true;
  }

  build /* istanbul ignore next */ (knex) {
    throw new Error('not implemented');
  }
}

module.exports = {
  LazyBuilder
};