'use strict';

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const { Validator } = require('./Validator');
const { ValidationErrorType } = require('../model/ValidationError');
const { isObject, once, cloneDeep: lodashCloneDeep, omit } = require('../utils/objectUtils');
const { parseFieldExpression } = require('../utils/parseFieldExpression');
const { getQueryPropKeys } = require('./modelQueryProps');

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

    // The cache keys of the unmodified model class schemas.
    self.modelCacheKeys = new WeakMap();

    const setupAjv = (ajv) => {
      if (conf.onCreateAjv) {
        conf.onCreateAjv(ajv);
      }
      // Only add Ajv formats if they weren't added in user-space already
      if (!ajv.formats['date-time']) {
        addFormats(ajv);
      }
    };

    setupAjv(self.ajv);
    setupAjv(self.ajvNoDefaults);

    // Created when needed by `compileQueryPropValidator()`.
    self.ajvQueryProps = null;
    self.setupAjv = setupAjv;
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
    const validator = this.getValidator(
      modelClass,
      ctx.jsonSchema,
      !!options.patch,
      options.patch ? null : getMissingQueryPropKeys(model, json, ctx.jsonSchema),
    );

    // We need to clone the input json if we are about to set default values.
    if (!options.mutable && !options.patch && setsDefaultValues(ctx.jsonSchema)) {
      json = cloneDeep(json);
    }

    // Patch objects can contain field expression keys like `'meta:b'` that update
    // a single property inside a json column. Validate them against the nested
    // schema by converting them into nested objects like `{ meta: { b: value } }`.
    const fieldExpressions = options.patch ? nestFieldExpressions(json) : null;
    const validationJson = fieldExpressions ? fieldExpressions.json : json;

    validator.call(model, validationJson);
    const error = parseValidationError(validator.errors, modelClass, options, this.ajvOptions);

    if (error) {
      throw error;
    }

    if (fieldExpressions) {
      // Copy back the changes made by Ajv options like `coerceTypes` and `removeAdditional`.
      unnestFieldExpressions(json, fieldExpressions);
    }

    return json;
  }

  getValidator(modelClass, jsonSchema, isPatchObject, queryPropKeys = null) {
    // Use the Ajv custom serializer if provided.
    const createCacheKey = this.ajvOptions.serialize || JSON.stringify;

    let cacheKey;

    if (jsonSchema === modelClass.getJsonSchema()) {
      // Optimization for the common case where jsonSchema is never modified.
      // The key is only computed once per model class. It includes the schema
      // contents so that model classes with the same `uniqueTag()` but
      // different schemas don't share validators, while bound model classes
      // with equal schemas still do.
      cacheKey = this.modelCacheKeys.get(modelClass);

      if (cacheKey === undefined) {
        cacheKey = `${modelClass.uniqueTag()}:${createCacheKey(jsonSchema)}`;
        this.modelCacheKeys.set(modelClass, cacheKey);
      }
    } else {
      cacheKey = createCacheKey(jsonSchema);
    }

    let validators = this.cache.get(cacheKey);
    let validator = null;

    if (!validators) {
      validators = {
        // Validator created for the schema object without `required` properties
        // using the Ajv instance that doesn't set default values.
        patchValidator: null,

        // Validator created for the unmodified schema.
        normalValidator: null,

        // Validators created for the schema object without the `required`
        // properties that are given as query properties, keyed by their names.
        queryPropValidators: null,
      };

      this.cache.set(cacheKey, validators);
    }

    if (isPatchObject) {
      validator = validators.patchValidator;

      if (!validator) {
        validator = this.compilePatchValidator(jsonSchema);
        validators.patchValidator = validator;
      }
    } else if (queryPropKeys) {
      const key = JSON.stringify(queryPropKeys);
      validators.queryPropValidators = validators.queryPropValidators || new Map();
      validator = validators.queryPropValidators.get(key);

      if (!validator) {
        validator = this.compileQueryPropValidator(
          jsonSchemaWithoutRequiredKeys(jsonSchema, queryPropKeys),
        );
        validators.queryPropValidators.set(key, validator);
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

  compileQueryPropValidator(jsonSchema) {
    // The schema is a modified copy that keeps the `$id`s of the original, so
    // it's compiled on an instance that doesn't add compiled schemas by their
    // `$id`. Otherwise ajv would throw because the ids already exist.
    if (!this.ajvQueryProps) {
      this.ajvQueryProps = new Ajv(
        Object.assign(
          {
            useDefaults: true,
          },
          this.ajvOptions,
          {
            addUsedSchema: false,
          },
        ),
      );

      this.setupAjv(this.ajvQueryProps);
    }

    for (;;) {
      try {
        return this.ajvQueryProps.compile(jsonSchema);
      } catch (err) {
        // The schemas of other model classes that `$ref`s point to aren't added
        // to this instance. Copy them over from the normal instance when needed.
        const validator =
          err instanceof Ajv.MissingRefError && this.ajv.getSchema(err.missingSchema);

        if (!validator) {
          throw err;
        }

        this.ajvQueryProps.addSchema(validator.schema, err.missingSchema);
      }
    }
  }
}

function parseValidationError(errors, modelClass, options, ajvOptions) {
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

    // Prepare error object
    const errorObj = {
      message: error.message,
      keyword: error.keyword,
      params: error.params,
    };

    // Add data if verbose enabled
    if (ajvOptions.verbose) {
      errorObj.data = error.data;
    }

    // Use unshift instead of push so that the last error ends up at [0],
    // preserving previous behavior where only the last error was stored.
    array.unshift(errorObj);

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

function nestFieldExpressions(json) {
  const keys = Object.keys(json);

  if (!keys.some(isFieldExpression)) {
    return null;
  }

  const nested = Object.create(null);
  const paths = new Map();
  // The objects created here for the nested paths. Other objects are values
  // of the input json and must not be modified.
  const createdObjects = new Set();

  for (const key of keys) {
    if (!isFieldExpression(key)) {
      nested[key] = json[key];
      paths.set(key, [key]);
    }
  }

  for (const key of keys) {
    if (isFieldExpression(key)) {
      const path = fieldExpressionPath(key);

      // Field expressions with array access, and those that conflict with other
      // keys of the patch, can't be validated without the current value of the
      // json column. Leave them out of the validation.
      if (path && setPath(nested, path, json[key], createdObjects)) {
        paths.set(key, path);
      }
    }
  }

  return { json: nested, paths };
}

function unnestFieldExpressions(json, { json: nested, paths }) {
  for (const [key, path] of paths) {
    let value = nested;
    let found = true;

    for (const prop of path) {
      found = isObject(value) && hasOwn(value, prop);

      if (!found) {
        break;
      }

      value = value[prop];
    }

    if (!found) {
      // Removed by `removeAdditional`.
      delete json[key];
    } else if (json[key] !== value) {
      json[key] = value;
    }
  }
}

function isFieldExpression(key) {
  return key.indexOf(':') !== -1;
}

function fieldExpressionPath(key) {
  let parsed;

  try {
    parsed = parseFieldExpression(key);
  } catch (err) {
    // Not a valid field expression, validate it as a top-level property.
    return [key];
  }

  // Numeric keys like the `0` in `tags:0` also access array elements when the
  // json value is an array, so treat them like `[0]`.
  if (parsed.access.some((access) => access.type !== 'object' || /^-?\d+$/.test(access.ref))) {
    return null;
  }

  return [parsed.column, ...parsed.access.map((access) => String(access.ref))];
}

function setPath(obj, path, value, createdObjects) {
  const last = path.length - 1;

  for (let i = 0; i < last; ++i) {
    const prop = path[i];

    if (!hasOwn(obj, prop)) {
      const child = Object.create(null);
      createdObjects.add(child);
      obj[prop] = child;
    } else if (!createdObjects.has(obj[prop])) {
      return false;
    }

    obj = obj[prop];
  }

  if (hasOwn(obj, path[last])) {
    return false;
  }

  obj[path[last]] = value;
  return true;
}

function hasOwn(obj, prop) {
  return Object.prototype.hasOwnProperty.call(obj, prop);
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

// Returns the keys of the query properties of `model` (`raw()`, `val()`,
// `ref()`, subqueries...) that are required by the schema but missing from
// `json`, sorted, or `null` if there are none. Query properties are split from
// the json before validation, but they do provide a value for the property.
function getMissingQueryPropKeys(model, json, jsonSchema) {
  const required = jsonSchema.required;

  if (!Array.isArray(required) || required.length === 0) {
    return null;
  }

  const keys = getQueryPropKeys(model).filter(
    (key) => required.includes(key) && !Object.prototype.hasOwnProperty.call(json, key),
  );

  return keys.length > 0 ? keys.sort() : null;
}

function jsonSchemaWithoutRequiredKeys(jsonSchema, keys) {
  return Object.assign({}, jsonSchema, {
    required: jsonSchema.required.filter((key) => !keys.includes(key)),
  });
}

function jsonSchemaWithoutRequired(jsonSchema) {
  // Boolean schemas (`true` / `false`) have no `required` to strip.
  if (!isObject(jsonSchema)) {
    return jsonSchema;
  }

  // `not` is intentionally left untouched: Stripping `required` inside it
  // would turn it into a schema that rejects everything (e.g.
  // `not: { required: ['a'] }` -> `not: {}`). Kept as is, it still holds for
  // patches: Any property present in the patch is also present in the
  // resulting object.
  const subSchemaProps = ['anyOf', 'oneOf', 'allOf', 'then', 'else', 'properties'];
  // `definitions` was renamed to `$defs` in draft 2019-09. Support both.
  const definitionProps = ['definitions', '$defs'];
  return Object.assign(
    omit(jsonSchema, ['required', ...subSchemaProps]),
    ...subSchemaProps.map((prop) => subSchemaWithoutRequired(jsonSchema, prop)),
    ...definitionProps.map((prop) => definitionsWithoutRequired(jsonSchema, prop)),
    jsonSchema.discriminator && jsonSchema.discriminator.propertyName
      ? { required: [jsonSchema.discriminator.propertyName] }
      : {},
  );
}

function definitionsWithoutRequired(jsonSchema, prop) {
  const definitions = jsonSchema && jsonSchema[prop];

  if (definitions && Object.keys(definitions).length > 0) {
    return {
      [prop]: Object.fromEntries(
        Object.entries(definitions).map(([key, schema]) => [
          key,
          jsonSchemaWithoutRequired(schema),
        ]),
      ),
    };
  } else {
    return {};
  }
}

function subSchemaWithoutRequired(jsonSchema, prop) {
  if (jsonSchema[prop] !== undefined) {
    if (Array.isArray(jsonSchema[prop])) {
      const schemaArray = jsonSchema[prop].map(jsonSchemaWithoutRequired);
      const nonEmptySchemaArray = schemaArray.filter((schema) => !matchesAnything(schema));

      // An `anyOf` or `oneOf` option that only consisted of `required` is
      // empty once `required` is stripped, and an empty schema matches any
      // patch, just like the stripped `required` keywords elsewhere and the
      // `true` schema. Drop the whole keyword then: requiring the patch to
      // match one of the remaining options would reject valid patches, and
      // with `oneOf` keeping the empty option would fail every patch that also
      // matches another option.
      if (prop !== 'allOf' && nonEmptySchemaArray.length !== schemaArray.length) {
        return {};
      } else if (nonEmptySchemaArray.length !== 0) {
        return {
          [prop]: nonEmptySchemaArray,
        };
      } else {
        return {};
      }
    } else if (prop === 'properties') {
      // `properties` is a map of property names to schemas, regardless of the
      // schema's `type` (which may also be e.g. `['object', 'null']`, or be
      // missing entirely).
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

function matchesAnything(schema) {
  return schema === true || (isObject(schema) && Object.keys(schema).length === 0);
}

module.exports = {
  AjvValidator,
};
