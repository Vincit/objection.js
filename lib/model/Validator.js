'use strict';

class Validator {
  beforeValidate(args) {
    args.model.$beforeValidate(null, args.json, args.options);
  }

  validate(args) {
    /* istanbul ignore next */
    throw new Error('not implemented');
  }

  afterValidate(args) {
    args.model.$afterValidate(args.json, args.options);
  }
}

module.exports = Validator;
