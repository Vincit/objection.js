'use strict';

class Validator {
  constructor(...args) {
    this.constructor.init(this, ...args);
  }

  static init() {}

  beforeValidate({ model, json, options }) {
    model.$beforeValidate(null, json, options);
  }

  validate() {
    /* istanbul ignore next */
    throw new Error('not implemented');
  }

  afterValidate({ model, json, options }) {
    model.$afterValidate(json, options);
  }
}

module.exports = {
  Validator
};
