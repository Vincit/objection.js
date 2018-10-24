const clone = require('./modelClone').clone;

function validate(model, json, options = {}) {
  json = json || model;

  const inputJson = json;
  const validatingModelInstance = inputJson && inputJson.$isObjectionModel;

  if (options.skipValidation) {
    return json;
  }

  if (validatingModelInstance) {
    // Strip away relations and other internal stuff.
    json = clone(json, true, true);
    // We can mutate `json` now that we took a copy of it.
    options = Object.assign({}, options, { mutable: true });
  }

  const modelClass = model.constructor;
  const validator = modelClass.getValidator();
  const args = {
    options,
    model,
    json,
    ctx: Object.create(null)
  };

  validator.beforeValidate(args);
  json = validator.validate(args);
  validator.afterValidate(args);

  if (validatingModelInstance) {
    // If we cloned `json`, we need to copy the possible default values.
    return inputJson.$set(json);
  } else {
    return json;
  }
}

module.exports = {
  validate
};
