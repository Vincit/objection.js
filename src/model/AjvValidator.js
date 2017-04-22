const _ = require('lodash');
const Ajv = require('ajv');
const Validator = require('./Validator');
const ValidationError = require('./ValidationError');

module.exports = class AjvValidator extends Validator {

  constructor(conf) {
    super();

    this.ajv = new Ajv(_.defaults({}, conf.options, {
      useDefaults: true
    }));

    this.ajvNoDefaults = new Ajv(_.assign({}, conf.options, {
      useDefaults: false
    }));

    this.cache = Object.create(null);

    conf.onCreateAjv(this.ajv);
    conf.onCreateAjv(this.ajvNoDefaults);
  }

  beforeValidate({model, json, options, ctx}) {
    ctx.jsonSchema = model.constructor.getJsonSchema();

    if (model.$beforeValidate !== model.objectionModelClass.prototype.$beforeValidate) {
      ctx.jsonSchema = _.cloneDeep(ctx.jsonSchema);
      ctx.jsonSchema = model.$beforeValidate(ctx.jsonSchema, json, options);
    }
  }

  validate({model, json, options, ctx}) {
    if (!ctx.jsonSchema) {
      return json;
    }

    const validator = this.getJsonSchemaValidator(model.constructor, ctx.jsonSchema, !!options.patch);

    if (!options.mutable && !options.patch && this.setsDefaultValues(ctx.jsonSchema)) {
      json = _.cloneDeep(json);
    }

    validator(json);

    if (validator.errors) {
      throw parseValidationError(validator.errors);
    }

    return json;
  }

  getJsonSchemaValidator(ModelClass, jsonSchema, skipRequired) {
    const key = jsonSchema === ModelClass.getJsonSchema()
      ? 'default'
      : JSON.stringify(jsonSchema);

    let validators = this.cache[key];

    if (!validators) {
      validators = {};
      this.cache[key] = validators;
    }

    let validator = validators[skipRequired];

    if (!validator) {
      validator = this.compileJsonSchemaValidator(jsonSchema, skipRequired);
      validators[skipRequired] = validator;
    }

    return validator;
  }

  compileJsonSchemaValidator(jsonSchema, skipRequired) {
    let origRequired;

    try {
      if (skipRequired) {
        origRequired = jsonSchema.required;
        jsonSchema.required = [];
        return this.ajvNoDefaults.compile(jsonSchema);
      } else {
        return this.ajv.compile(jsonSchema);
      }
    } finally {
      if (skipRequired) {
        jsonSchema.required = origRequired;
      }
    }
  }

  setsDefaultValues(jsonSchema) {
    return jsonSchema && jsonSchema.properties && hasDefaults(jsonSchema.properties);
  }
}

function parseValidationError(errors) {
  const errorHash = {};
  let index = 0;

  for (let i = 0; i < errors.length; ++i) {
    let error = errors[i];
    let key = error.dataPath.substring(1);

    if (!key) {
      let match = /should have required property '(.+)'/.exec(error.message);
      if (match && match.length > 1) {
        key = match[1];
      }
    }

    if (!key && error.params && error.params.additionalProperty) {
      key = error.params.additionalProperty;
    }

    if (!key) {
      key = (index++).toString();
    }

    errorHash[key] = [{
      message: error.message,
      keyword: error.keyword,
      params: error.params
    }];
  }

  return new ValidationError(errorHash);
}

function hasDefaults(obj) {
  if (Array.isArray(obj)) {
    return arrayHasDefaults(obj);
  } else {
    return objectHasDefaults(obj);
  }
}

function arrayHasDefaults(arr) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    const val = arr[i];

    if (val && typeof val === 'object' && hasDefaults(val)) {
      return true;
    }
  }

  return false;
}

function objectHasDefaults(obj) {
  const keys = Object.keys(obj);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key === 'default') {
      return true;
    } else {
      const val = obj[key];

      if (val && typeof val === 'object' && hasDefaults(val)) {
        return true;
      }
    }
  }

  return false;
}
