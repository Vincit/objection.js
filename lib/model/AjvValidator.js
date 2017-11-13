'use strict';

const Ajv = require('ajv');
const Validator = require('./Validator');
const cloneDeep = require('lodash/cloneDeep');

class AjvValidator extends Validator {
  constructor(conf) {
    super();

    this.ajvOptions = Object.assign(
      {
        useDefaults: true
      },
      conf.options
    );

    this.ajv = new Ajv(this.ajvOptions);

    this.ajvNoDefaults = new Ajv(
      Object.assign({}, conf.options, {
        useDefaults: false
      })
    );

    this.cache = Object.create(null);

    conf.onCreateAjv(this.ajv);
    conf.onCreateAjv(this.ajvNoDefaults);
  }

  beforeValidate(args) {
    const json = args.json;
    const model = args.model;
    const options = args.options;
    const ctx = args.ctx;

    ctx.jsonSchema = model.constructor.getJsonSchema();

    if (model.$beforeValidate !== model.$objectionModelClass.prototype.$beforeValidate) {
      ctx.jsonSchema = cloneDeep(ctx.jsonSchema);
      ctx.jsonSchema = model.$beforeValidate(ctx.jsonSchema, json, options);
    }
  }

  validate(args) {
    let json = args.json;
    const model = args.model;
    const options = args.options;
    const ctx = args.ctx;

    if (!ctx.jsonSchema) {
      return json;
    }

    const validator = this.getValidator(model.constructor, ctx.jsonSchema, !!options.patch);

    if (!options.mutable && !options.patch && this.setsDefaultValues(ctx.jsonSchema)) {
      json = cloneDeep(json);
    }

    // Allow Ajv's options.passContext to be used in order to receive the model
    // instance as `this` inside custom keywords and formats.
    if (this.ajvOptions.passContext) {
      validator.call(model, json);
    } else {
      validator(json);
    }

    if (validator.errors) {
      throw parseValidationError(validator.errors, model.constructor);
    }

    return json;
  }

  getValidator(ModelClass, jsonSchema, skipRequired) {
    // Use the AJV custom serializer if provided.
    const serialize = this.ajvOptions.serialize || JSON.stringify;

    // Optimization for the common case where jsonSchema is never modified.
    // In that case we don't need to call the costly JSON.stringify.
    const key =
      jsonSchema === ModelClass.getJsonSchema()
        ? ModelClass.name || ModelClass.getTableName()
        : serialize(jsonSchema);

    let validators = this.cache[key];

    if (!validators) {
      validators = {};
      this.cache[key] = validators;
    }

    let validator = validators[skipRequired];

    if (!validator) {
      validator = this.compileValidator(jsonSchema, skipRequired);
      validators[skipRequired] = validator;
    }

    return validator;
  }

  compileValidator(jsonSchema, skipRequired) {
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

function parseValidationError(errors, modelClass) {
  const errorHash = {};
  let index = 0;

  for (let i = 0; i < errors.length; ++i) {
    let error = errors[i];
    let key = error.dataPath.substring(1);

    if (!key) {
      const params = error.params;
      key = params && (params.missingProperty || params.additionalProperty);
      if (!key) {
        key = (index++).toString();
      }
    }

    // More than one error can occur for the same key in Ajv, merge them in the array:
    const array = errorHash[key] || (errorHash[key] = []);
    // Use unshift instead of push so that the last error ends up at [0],
    // preserving previous behavior where only the last error was stored.
    array.unshift({
      message: error.message,
      keyword: error.keyword,
      params: error.params
    });
  }

  return modelClass.createValidationError(errorHash);
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

module.exports = AjvValidator;
