'use strict';

const Ajv = require('ajv');
const Validator = require('./Validator');
const cloneDeep = require('lodash/cloneDeep');

class AjvValidator extends Validator {
  constructor(conf) {
    super();

    this.ajvOptions = Object.assign({}, conf.options);

    // Create a normal Ajv instance.
    this.ajv = new Ajv(
      Object.assign(
        {
          useDefaults: true
        },
        conf.options
      )
    );

    // Create an instance that doesn't set default values. We need this one
    // to validate `patch` objects (objects that have a subset of properties).
    this.ajvNoDefaults = new Ajv(
      Object.assign({}, conf.options, {
        useDefaults: false
      })
    );

    // A cache for the compiled validator functions.
    this.cache = new Map();

    conf.onCreateAjv(this.ajv);
    conf.onCreateAjv(this.ajvNoDefaults);
  }

  beforeValidate(args) {
    const json = args.json;
    const model = args.model;
    const options = args.options;
    const ctx = args.ctx;

    ctx.jsonSchema = model.constructor.getJsonSchema();

    // Objection model's have a `$beforeValidate` hook that is allowed to modify the schema.
    // We need to clone the schema in case the function modifies it. We only do this in the
    // rare case that the given model has implemented the hook.
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

    // We need to clone the input json if we are about to set default values.
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

  getValidator(ModelClass, jsonSchema, isPatchObject) {
    // Use the AJV custom serializer if provided.
    const createCacheKey = this.ajvOptions.serialize || JSON.stringify;

    // Optimization for the common case where jsonSchema is never modified.
    // In that case we don't need to call the costly JSON.stringify.
    const cacheKey =
      jsonSchema === ModelClass.getJsonSchema()
        ? ModelClass.name || ModelClass.uniqueTag()
        : createCacheKey(jsonSchema);

    let validators = this.cache.get(cacheKey);

    if (!validators) {
      validators = {
        // Validator created for the schema object without `required` properties
        // using the AJV instance that doesn't set default values.
        patchValidator: null,
        // Validator created for the unmodified schema.
        normalValidator: null
      };

      this.cache.set(cacheKey, validators);
    }

    let validator;

    if (isPatchObject) {
      validator = validators.patchValidator;
    } else {
      validator = validators.normalValidator;
    }

    if (!validator) {
      if (isPatchObject) {
        validator = this.compilePatchValidator(jsonSchema);
        validators.patchValidator = validator;
      } else {
        validator = this.compileNormalValidator(jsonSchema);
        validators.normalValidator = validator;
      }
    }

    return validator;
  }

  compilePatchValidator(jsonSchema) {
    jsonSchema = cloneDeep(jsonSchema);

    delete jsonSchema.required;

    ['anyOf', 'oneOf', 'allOf'].forEach(prop => {
      if (Array.isArray(jsonSchema[prop])) {
        jsonSchema[prop] = jsonSchema[prop]
          .map(schema => delete schema.required)
          .filter(schema => Object.keys(schema).length > 0);

        if (jsonSchema[prop].length === 0) {
          delete jsonSchema[prop];
        }
      }
    });

    // We need to use the ajv instance that doesn't set the default values.
    return this.ajvNoDefaults.compile(jsonSchema);
  }

  compileNormalValidator(jsonSchema) {
    return this.ajv.compile(jsonSchema);
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
