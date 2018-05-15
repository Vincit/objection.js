const Validator = require('./Validator');

const { Type: ValidationErrorType } = require('../model/ValidationError');
const { isObject, once, cloneDeep: lodashCloneDeep, omit } = require('../utils/objectUtils');

const getAjv = once(() => {
  try {
    return require('ajv');
  } catch (err) {
    throw new Error('Optional ajv dependency not installed. Please run `npm install ajv --save`');
  }
});

class AjvValidator extends Validator {
  constructor(conf) {
    super();

    this.ajvOptions = Object.assign({ errorDataPath: 'property' }, conf.options, {
      allErrors: true
    });

    // Create a normal Ajv instance.
    this.ajv = new getAjv()(
      Object.assign(
        {
          useDefaults: true
        },
        this.ajvOptions
      )
    );

    // Create an instance that doesn't set default values. We need this one
    // to validate `patch` objects (objects that have a subset of properties).
    this.ajvNoDefaults = new getAjv()(
      Object.assign({}, this.ajvOptions, {
        useDefaults: false
      })
    );

    // A cache for the compiled validator functions.
    this.cache = new Map();

    conf.onCreateAjv(this.ajv);
    conf.onCreateAjv(this.ajvNoDefaults);
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
        normalValidator: null
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

  let relations = modelClass.getRelations();
  let errorHash = {};
  let numErrors = 0;

  for (let i = 0; i < errors.length; ++i) {
    const error = errors[i];
    const dataPath = `${options.dataPath || ''}${error.dataPath}`;

    // If additionalProperties = false, relations can pop up as additionalProperty
    // errors. Skip those.
    if (
      error.params &&
      error.params.additionalProperty &&
      relations[error.params.additionalProperty]
    ) {
      continue;
    }

    // Unknown properties are reported in `['propertyName']` notation,
    // so replace those with dot-notation, see:
    // https://github.com/epoberezkin/ajv/issues/671
    const key = dataPath.replace(/\['([^' ]*)'\]/g, '.$1').substring(1);

    // More than one error can occur for the same key in Ajv, merge them in the array:
    const array = errorHash[key] || (errorHash[key] = []);

    // Use unshift instead of push so that the last error ends up at [0],
    // preserving previous behavior where only the last error was stored.
    array.unshift({
      message: error.message,
      keyword: error.keyword,
      params: error.params
    });

    ++numErrors;
  }

  if (numErrors === 0) {
    return null;
  }

  return modelClass.createValidationError({
    type: ValidationErrorType.ModelValidation,
    data: errorHash
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
  const subSchemaProps = ['anyOf', 'oneOf', 'allOf', 'not', 'then', 'else'];

  return Object.assign(
    omit(jsonSchema, ['required', ...subSchemaProps]),
    ...subSchemaProps.map(prop => subSchemaWithoutRequired(jsonSchema, prop))
  );
}

function subSchemaWithoutRequired(jsonSchema, prop) {
  if (jsonSchema[prop]) {
    if (Array.isArray(jsonSchema[prop])) {
      const schemaArray = jsonSchemaArrayWithoutRequired(jsonSchema[prop]);

      if (schemaArray.length !== 0) {
        return {
          [prop]: schemaArray
        };
      } else {
        return {};
      }
    } else {
      return {
        [prop]: jsonSchemaWithoutRequired(jsonSchema[prop])
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

module.exports = AjvValidator;
