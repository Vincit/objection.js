module.exports = class Validator {
  beforeValidate({model, json, options}) {
    model.$beforeValidate(null, json, options);
  }

  validate({model, json, options}) {
    throw new Error('not implemented');
  }

  afterValidate({model, json, options}) {
    model.$afterValidate(json, options);
  }
}