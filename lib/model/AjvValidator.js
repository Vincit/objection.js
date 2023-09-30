'use strict';

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { Validator } = require('./Validator');
const { ValidationErrorType } = require('../model/ValidationError');
const { isObject, once, cloneDeep: lodashCloneDeep, omit } = require('../utils/objectUtils');

class AjvValidator extends Validator {
  static init(self, conf) {
    super.init(self, conf);

    self.ajvOptions = Object.assign({}, conf.options, {
      allErrors: true,
    });

    // Create a normal Ajv instance.
    self.ajv = new Ajv(
      Object.assign(
        {
          useDefaults: true,
        },
        self.ajvOptions,
      ),
    );

    // Create an instance that doesn't set default values. We need this one
    // to validate `patch` objects (objects that have a subset of properties).
    self.ajvNoDefaults = new Ajv(
      Object.assign({}, self.ajvOptions, {
        useDefaults: false,
      }),
    );

    // A cache for the compiled validator functions.
    self.cache = new Map();

    const setupAjv = (ajv) => {
      conf.onCreateAjv(ajv);
      // Only add AJV formats if they weren't added in user-space already
      if (!ajv.formats['date-time']) {
        addFormats(ajv);
      }
    };

    setupAjv(self.ajv);
    setupAjv(self.ajvNoDefaults);
  }

  beforeValidate({ json, model, options, ctx }) {
    ctx.jsonSchema = model.constructor.getJsonSchema();

    // Objection model's have a `$beforeValidate` hook that is allowed to modify the schema.
    // We need to clone the schema in case the function modifies it. We only do this in the
    // rare case that the given model has implemented the hook.
    if (model.$beforeValidate !== model.$objectionModelClass.prototype.$beforeValidate) {
      ctx.jsonSchema = cloneDeep(ctx.jsonSchema);
      const ret = model.$beforeValidate(ctx.jsonSchema, json, options);

      if (ret !== undefined) {
        ctx.jsonSchema = ret;
      }
    }
  }

  validate({ json, model, options, ctx }) {
    if (!ctx.jsonSchema) {
      return json;
    }

    const modelClass = model.constructor;
    const validator = this.getValidator(modelClass, ctx.jsonSchema, !!options.patch);

    // We need to clone the input json if we are about to set default values.
    if (!options.mutable && !options.patch && setsDefaultValues(ctx.jsonSchema)) {
      json = cloneDeep(json);
    }

    validator.call(model, json);
    const error = parseValidationError(validator.errors, modelClass, options);

    if (error) {
      throw error;
    }

    return json;
  }

  getValidator(modelClass, jsonSchema, isPatchObject) {
    // Use the AJV custom serializer if provided.
    const createCacheKey = this.ajvOptions.serialize || JSON.stringify;

    // Optimization for the common case where jsonSchema is never modified.
    // In that case we don't need to call the costly createCacheKey function.
    const cacheKey =
      jsonSchema === modelClass.getJsonSchema()
        ? modelClass.uniqueTag()
        : createCacheKey(jsonSchema);

    let validators = this.cache.get(cacheKey);
    let validator = null;

    if (!validators) {
      validators = {
        // Validator created for the schema object without `required` properties
        // using the AJV instance that doesn't set default values.
        patchValidator: null,

        // Validator created for the unmodified schema.
        normalValidator: null,
      };

      this.cache.set(cacheKey, validators);
    }

    if (isPatchObject) {
      validator = validators.patchValidator;

      if (!validator) {
        validator = this.compilePatchValidator(jsonSchema);
        validators.patchValidator = validator;
      }
    } else {
      validator = validators.normalValidator;

      if (!validator) {
        validator = this.compileNormalValidator(jsonSchema);
        validators.normalValidator = validator;
      }
    }

    return validator;
  }

  compilePatchValidator(jsonSchema) {
    jsonSchema = jsonSchemaWithoutRequired(jsonSchema);
    // We need to use the ajv instance that doesn't set the default values.
    return this.ajvNoDefaults.compile(jsonSchema);
  }

  compileNormalValidator(jsonSchema) {
    return this.ajv.compile(jsonSchema);
  }
}

function parseValidationError(errors, modelClass, options) {
  if (!errors) {
    return null;
  }

  let relationNames = modelClass.getRelationNames();
  let errorHash = {};
  let numErrors = 0;

  for (const error of errors) {
    // If additionalProperties = false, relations can pop up as additionalProperty
    // errors. Skip those.
    if (
      error.params &&
      error.params.additionalProperty &&
      relationNames.includes(error.params.additionalProperty)
    ) {
      continue;
    }

    let path = error.instancePath.replace(/\//g, '.');

    if (error.params) {
      if (error.params.missingProperty) {
        path += `.${error.params.missingProperty}`;
      } else if (error.params.additionalProperty) {
        path += `.${error.params.additionalProperty}`;
      }
    }

    const key = `${options.dataPath || ''}${path}`.substring(1);

    // More than one error can occur for the same key in Ajv, merge them in the array:
    const array = errorHash[key] || (errorHash[key] = []);

    // Use unshift instead of push so that the last error ends up at [0],
    // preserving previous behavior where only the last error was stored.
    array.unshift({
      message: error.message,
      keyword: error.keyword,
      params: error.params,
    });

    ++numErrors;
  }

  if (numErrors === 0) {
    return null;
  }

  return modelClass.createValidationError({
    type: ValidationErrorType.ModelValidation,
    data: errorHash,
  });
}

function cloneDeep(obj) {
  if (isObject(obj) && obj.$isObjectionModel) {
    return obj.$clone();
  } else {
    return lodashCloneDeep(obj);
  }
}

function setsDefaultValues(jsonSchema) {
  return jsonSchema && jsonSchema.properties && hasDefaults(jsonSchema.properties);
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

    if (isObject(val) && hasDefaults(val)) {
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

      if (isObject(val) && hasDefaults(val)) {
        return true;
      }
    }
  }

  return false;
}

function jsonSchemaWithoutRequired(jsonSchema) {
  const subSchemaProps = ['anyOf', 'oneOf', 'allOf', 'not', 'then', 'else', 'properties'];
  return Object.assign(
    omit(jsonSchema, ['required', ...subSchemaProps]),
    ...subSchemaProps.map((prop) => subSchemaWithoutRequired(jsonSchema, prop)),
    jsonSchema && jsonSchema.definitions && Object.keys(jsonSchema.definitions).length > 0
      ? {
          definitions: Object.assign(
            ...Object.keys(jsonSchema.definitions).map((prop) => ({
              [prop]: jsonSchemaWithoutRequired(jsonSchema.definitions[prop]),
            })),
          ),
        }
      : {},
    jsonSchema.discriminator && jsonSchema.discriminator.propertyName
      ? { required: [jsonSchema.discriminator.propertyName] }
      : {},
  );
}

function subSchemaWithoutRequired(jsonSchema, prop) {
  if (jsonSchema[prop]) {
    if (Array.isArray(jsonSchema[prop])) {
      const schemaArray = jsonSchemaArrayWithoutRequired(jsonSchema[prop]);

      if (schemaArray.length !== 0) {
        return {
          [prop]: schemaArray,
        };
      } else {
        return {};
      }
    } else if (jsonSchema.type === 'object' && prop === 'properties') {
      return {
        [prop]: Object.fromEntries(
          Object.entries(jsonSchema[prop]).map(([key, schema]) => [
            key,
            jsonSchemaWithoutRequired(schema),
          ]),
        ),
      };
    } else {
      return {
        [prop]: jsonSchemaWithoutRequired(jsonSchema[prop]),
      };
    }
  } else {
    return {};
  }
}

function jsonSchemaArrayWithoutRequired(jsonSchemaArray) {
  return jsonSchemaArray.map(jsonSchemaWithoutRequired).filter(isNotEmptyObject);
}

function isNotEmptyObject(obj) {
  return Object.keys(obj).length !== 0;
}

module.exports = {
  AjvValidator,
};
