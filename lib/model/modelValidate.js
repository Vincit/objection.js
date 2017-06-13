'use strict';

const cloneModel = require('./modelClone').cloneModel;

function $validate(json, options) {
  json = json || this;
  options = options || {};

  if (json && json.$isObjectionModel) {
    // Strip away relations and other internal stuff.
    json = cloneModel(json, true, true);
    // We can mutate `json` now that we took a copy of it.
    options.mutable = true;
  }

  if (options.skipValidation) {
    return json;
  }

  const ModelClass = this.constructor;
  const validator = ModelClass.getValidator();
  const args = {
    options: options,
    model: this,
    json: json,
    ctx: Object.create(null)
  };

  validator.beforeValidate(args);
  json = validator.validate(args);
  validator.afterValidate(args);

  return json;
}

module.exports = {
  $validate
};