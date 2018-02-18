class Validator {
  beforeValidate({ model, json, options }) {
    model.$beforeValidate(null, json, options);
  }

  validate(args) {
    /* istanbul ignore next */
    throw new Error('not implemented');
  }

  afterValidate({ model, json, options }) {
    model.$afterValidate(json, options);
  }
}

module.exports = Validator;
