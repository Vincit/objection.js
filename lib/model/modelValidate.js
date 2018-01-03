'use strict';

const clone = require('./modelClone').clone;
const defineNonEnumerableProperty = require('./modelUtils').defineNonEnumerableProperty;

function validate(model, json, options) {
  json = json || model;
  options = options || {};

  if (json && json.$isObjectionModel) {
    // Strip away relations and other internal stuff.
    json = clone(json, true, true);
    // We can mutate `json` now that we took a copy of it.
    options.mutable = true;
  }

  if (options.skipValidation) {
    return json;
  }

  const ModelClass = model.constructor;
  const validator = ModelClass.getValidator();
  const args = {
    options,
    model,
    json,
    ctx: Object.create(null)
  };

  validator.beforeValidate(args);
  json = validator.validate(args);
  validator.afterValidate(args);

  return json;
}

module.exports = {
  validate
};
