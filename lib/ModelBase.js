"use strict";

var _ = require('lodash')
  , tv4 = require('tv4')
  , uuid = require('node-uuid')
  , tv4Formats = require('tv4-formats')
  , utils = require('./utils')
  , ValidationError = require('./ValidationError');

// Add validation formats, so that for example the following schema validation works:
// createTime: {type: 'string', format: 'date-time'}
tv4.addFormat(tv4Formats);

/**
 * @typedef {Object} ModelOptions
 *
 * @property {Boolean} [patch]
 *    If true the json is treated as a patch and the `required` field of the json schema is
 *    ignored in the validation. This allows us to create models with a subset of required
 *    properties for patch operations.
 *
 * @property {Boolean} [skipValidation]
 *    If true the json schema validation is skipped.
 */

/**
 * Base class for models.
 *
 * ModelBase provides a mechanism for automatic JSON validation and a way to attach
 * functionality to plain javascript objects. A subclass can be created like this:
 *
 * ```js
 * function Person() {
 *   ModelBase.apply(this, arguments);
 * }
 *
 * ModelBase.extend(Person);
 *
 * Person.prototype.fullName = function () {
 *   return this.firstName + ' ' + this.lastName;
 * };
 *
 * Person.jsonSchema = {
 *   type: 'object',
 *   properties: {
 *     id: {type: 'integer'},
 *     firstName: {type: 'string'},
 *     lastName: {type: 'string'}
 *   }
 * };
 * ```
 *
 * Use `ModelBase.from*Json` methods to create models from JSON objects:
 *
 * ```js
 * var person = Person.fromJson({firstName: 'Jennifer', lastName: 'Lawrence'});
 *
 * console.log(person.firstName); // --> 'Jennifer'
 * console.log(person.lastName); // --> 'Lawrence'
 * console.log(person.fullName()); // --> 'Jennifer Lawrence'
 *
 * // This throws because the schema validation fails.
 * var person2 = Person.fromJson({firstName: 10});
 * ```
 *
 * Properties that are prefixed with '$' are excluded from all JSON representations:
 *
 * ```js
 * var person = Person.fromJson({firstName: 'Jennifer');
 * person.$spam = 100;
 *
 * console.log(person); // --> {firstName: 'Jennifer'}
 * console.log(person.$toJson()); // --> {firstName: 'Jennifer'}
 * ```
 *
 * ModelBase makes it possible to have a different database representation for a model.
 * For example if your column names are snake_cased in the database but you want to use
 * camelCased properties in the code and outside the server you can do this:
 *
 * ```js
 * // This is called when an object is serialized to database format.
 * Person.prototype.$formatDatabaseJson = function (json) {
 *   // Call superclass implementation.
 *   json = ModelBase.prototype.$formatDatabaseJson.call(this, json);
 *
 *   return _.mapKeys(json, function (value, key) {
 *     return _.snakeCase(key);
 *   });
 * };
 *
 * // This is called when an object is read from database.
 * Person.prototype.$parseDatabaseJson = function (json) {
 *   json = _.mapKeys(json, function (value, key) {
 *     return _.camelCase(key);
 *   });
 *
 *   // Call superclass implementation.
 *   return ModelBase.prototype.$parseDatabaseJson.call(this, json);
 * };
 * ```
 *
 * @constructor
 */
function ModelBase() {
  // Nothing to do here.
}

/**
 * This is called before validation.
 *
 * Here you can dynamically edit the jsonSchema if needed.
 *
 * @param {Object} jsonSchema
 *    A deep clone of this class's jsonSchema.
 *
 * @param {Object} json
 *    The JSON object to be validated.
 *
 * @param {ModelOptions=} options
 *    Optional options.
 *
 * @return {Object}
 *    The (possibly) modified jsonSchema.
 */
ModelBase.prototype.$beforeValidate = function (jsonSchema, json, options) {
  /* istanbul ignore next */
  return jsonSchema;
};

/**
 * Validates the given JSON object.
 *
 * Calls `$beforeValidation` and `$afterValidation` methods. This method is called
 * automatically from `fromJson` and `$setJson` methods. This method can also be
 * called explicitly when needed.
 *
 * @throws {ValidationError}
 *    If validation fails.
 *
 * @param {Object=} json
 *    If not given ==> this.
 *
 * @param {ModelOptions=} options
 *    Optional options.
 *
 * @return {Object}
 *    The input json
 */
ModelBase.prototype.$validate = function (json, options) {
  var ModelClass = this.constructor;
  var jsonSchema = ModelClass.jsonSchema;
  var required;

  options = options || {};
  json = json || this;

  if (!jsonSchema || options.skipValidation) {
    return json;
  }

  // No need to call $beforeValidate (and clone the jsonSchema) if $beforeValidate has not been overwritten.
  if (this.$beforeValidate !== ModelBase.prototype.$beforeValidate) {
    jsonSchema = _.cloneDeep(jsonSchema);
    jsonSchema = this.$beforeValidate(jsonSchema, json, options);
  }

  var report = tryValidate(jsonSchema, json, options);
  var validationError = parseValidationError(report);

  if (validationError) {
    throw validationError;
  }

  this.$afterValidate(json, options);
  return json;
};

/**
 * This is called after successful validation.
 *
 * You can do further validation here and throw a ValidationError if something goes wrong.
 *
 * @param {Object=} json
 *    The JSON object to validate.
 *
 * @param {ModelOptions=} options
 *    Optional options.
 */
ModelBase.prototype.$afterValidate = function (json, options) {
  // Do nothing by default.
};

/**
 * This is called when a ModelBase is created from a database JSON object.
 *
 * Converts the JSON object from the database format to the internal format.
 *
 * @note This function must handle the case where any subset of the columns comes
 *    in the `json` argument. You cannot assume that all columns are present as it
 *    depends on the select statement. There can also be additional columns because
 *    of join clauses, aliases etc.
 *
 * @note If you override this remember to call the super class's implementation.
 *
 * @param {Object} json
 *    The JSON object in database format.
 *
 * @return {Object}
 *    The JSON object in internal format.
 */
ModelBase.prototype.$parseDatabaseJson = function (json) {
  return json;
};

/**
 * This is called when a ModelBase is converted to database format.
 *
 * Converts the JSON object from the internal format to the database format.
 *
 * @note If you override this remember to call the super class's implementation.
 *
 * @param {Object} json
 *    The JSON object in internal format.
 *
 * @return {Object}
 *    The JSON object in database format.
 */
ModelBase.prototype.$formatDatabaseJson = function (json) {
  return json;
};

/**
 * This is called when a ModelBase is created from a JSON object.
 *
 * Converts the JSON object to the internal format.
 *
 * @note If you override this remember to call the super class's implementation.
 *
 * @param {Object} json
 *    The JSON object in external format.
 *
 * @param {ModelOptions=} options
 *    Optional options.
 *
 * @return {Object}
 *    The JSON object in internal format.
 */
ModelBase.prototype.$parseJson = function (json, options) {
  return json;
};

/**
 * This is called when a ModelBase is converted to JSON.
 *
 * @note Remember to call the super class's implementation.
 *
 * @param {Object} json
 *    The JSON object in internal format
 *
 * @return {Object}
 *    The JSON object in external format.
 */
ModelBase.prototype.$formatJson = function (json) {
  return json;
};

/**
 * Exports this model as a database JSON object.
 *
 * Calls `$formatDatabaseJson()`.
 *
 * @return {Object}
 *    This model as a JSON object in database format.
 */
ModelBase.prototype.$toDatabaseJson = function () {
  return this.$$toJson(true, null, null);
};

/**
 * Exports this model as a JSON object.
 *
 * Calls `$formatJson()`.
 *
 * @return {Object}
 *    This model as a JSON object.
 */
ModelBase.prototype.$toJson = function () {
  return this.$$toJson(false, null, null);
};

/**
 * Alias for `this.$toJson()`.
 *
 * For JSON.stringify compatibility.
 */
ModelBase.prototype.toJSON = function () {
  return this.$toJson();
};

/**
 * Sets the values from a JSON object.
 *
 * Validates the JSON before setting values. Calls `this.$parseJson()`.
 *
 * @param {Object} json
 *    The JSON object to set.
 *
 * @param {ModelOptions=} options
 *    Optional options.
 *
 * @throws ValidationError
 *    If validation fails.
 */
ModelBase.prototype.$setJson = function (json, options) {
  json = json || {};
  options = options || {};

  if (!_.isObject(json)
    || _.isString(json)
    || _.isNumber(json)
    || _.isDate(json)
    || _.isArray(json)
    || _.isFunction(json)
    || _.isTypedArray(json)
    || _.isRegExp(json)) {

    throw new Error('You should only pass objects to $setJson method. '
      + '$setJson method was given an invalid value '
      + json);
  }

  if (!options.patch) {
    json = mergeWithDefaults(this.constructor.jsonSchema, json);
  }

  json = this.$parseJson(json, options);
  json = this.$validate(json, options);

  this.$set(json);
};

/**
 * Sets the values from a JSON object in database format.
 *
 * Calls `this.$parseDatabaseJson()`.
 *
 * @param {Object} json
 *    The JSON object in database format.
 */
ModelBase.prototype.$setDatabaseJson = function (json) {
  json = this.$parseDatabaseJson(json || {});

  for (var key in json) {
    this[key] = json[key];
  }
};

/**
 * Sets the values from another model or object.
 *
 * Unlike $setJson, this doesn't call any `$parseJson` methods or validate the input.
 * This simply sets each value in the object to this object.
 *
 * @param {Object} obj
 */
ModelBase.prototype.$set = function (obj) {
  var self = this;

  _.each(obj, function $setLooper(value, key) {
    if (key.charAt(0) !== '$' && !_.isFunction(value)) {
      self[key] = value;
    }
  });

  return this;
};

/**
 * Omits a set of properties.
 *
 * The selected properties are set to `undefined`. Note that this is done in-place.
 * Properties are set to undefined instead of deleting them for performance reasons
 * (V8 doesn't like delete).
 *
 * ```js
 * var json = person
 *   .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
 *   .$omit('lastName')
 *   .toJSON();
 *
 * console.log(_.has(json, 'lastName')); // --> false
 * ```
 *
 * ```js
 * var json = person
 *   .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
 *   .$omit('lastName')
 *   .toJSON();
 *
 * console.log(_.has(json, 'lastName')); // --> false
 * ```
 *
 * ```js
 * var json = person
 *   .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
 *   .$omit('lastName')
 *   .toJSON();
 *
 * console.log(_.has(json, 'lastName')); // --> false
 * ```
 *
 * @param {Array.<String>|Object.<String, Boolean>} keys
 */
ModelBase.prototype.$omit = function () {
  if (arguments.length === 1 && _.isObject(arguments[0])) {
    var keys = arguments[0];

    if (_.isArray(keys)) {
      omitArray(this, keys);
    } else {
      omitObject(this, keys);
    }
  } else {
    omitArray(this, _.toArray(arguments));
  }

  return this;
};

/**
 * Picks a set of properties.
 *
 * All other properties but the selected ones are set to `undefined`. Note that
 * this is done in-place. Properties are set to undefined instead of deleting
 * them for performance reasons (V8 doesn't like delete).
 *
 * ```js
 * var json = person
 *   .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
 *   .$pick('firstName', 'age')
 *   .toJSON();
 *
 * console.log(_.has(json, 'lastName')); // --> false
 * ```
 *
 * ```js
 * var json = person
 *   .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
 *   .$pick(['firstName', 'age'])
 *   .toJSON();
 *
 * console.log(_.has(json, 'lastName')); // --> false
 * ```
 *
 * ```js
 * var json = person
 *   .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
 *   .$pick({firstName: true, age: true})
 *   .toJSON();
 *
 * console.log(_.has(json, 'lastName')); // --> false
 * ```
 *
 * @param {Array.<String>|Object.<String, Boolean>} keys
 */
ModelBase.prototype.$pick = function () {
  if (arguments.length === 1 && _.isObject(arguments[0])) {
    var keys = arguments[0];

    if (_.isArray(keys)) {
      pickArray(this, keys);
    } else {
      pickObject(this, keys);
    }
  } else {
    pickArray(this, _.toArray(arguments));
  }

  return this;
};

/**
 * Returns a deep copy of this model.
 *
 * If this object has instances of ModelBase as properties (or arrays of them)
 * they are cloned using their `.$clone()` method.
 *
 * @return {ModelBase}
 */
ModelBase.prototype.$clone = function () {
  var clone = new this.constructor();

  _.each(this, function cloneLooper(value, key) {
    if (_.isObject(value)) {
      clone[key] = cloneObject(value);
    } else {
      clone[key] = value;
    }
  });

  return clone;
};

/**
 * The optional schema against which the JSON is validated.
 *
 * The jsonSchema can be dynamically modified in the `$beforeValidate` method.
 *
 * Must follow http://json-schema.org specification. If null no validation is done.
 *
 * @see $beforeValidate()
 * @see $validate()
 * @see $afterValidate()
 *
 * @type {Object}
 */
ModelBase.jsonSchema = null;

/**
 * @private
 */
ModelBase.$$colToProp = null;

/**
 * @private
 */
ModelBase.$$propToCol = null;

/**
 * Makes the given constructor a subclass of this class.
 *
 * @param {function=} subclassConstructor
 * @return {function}
 */
ModelBase.extend = function (subclassConstructor) {
  if (_.isEmpty(subclassConstructor.name)) {
    throw new Error('Each ModelBase subclass constructor must have a name');
  }

  utils.inherits(subclassConstructor, this);
  return subclassConstructor;
};

/**
 * Creates a model instance from a JSON object.
 *
 * The object is checked against `jsonSchema` and an exception is thrown on failure.
 *
 * @param {Object=} json
 *    The JSON from which to create the model.
 *
 * @param {ModelOptions=} options
 *    Optional options.
 *
 * @throws ValidationError
 *    If validation fails.
 */
ModelBase.fromJson = function (json, options) {
  var model = new this();
  model.$setJson(json || {}, options);
  return model;
};

/**
 * Creates a model instance from a JSON object in database format.
 *
 * @param {Object=} json
 *    The JSON from which to create the model.
 */
ModelBase.fromDatabaseJson = function (json) {
  var model = new this();
  model.$setDatabaseJson(json || {});
  return model;
};

/**
 * Omit implementation to use.
 *
 * The default just sets the property to undefined for performance reasons.
 * If the slight performance drop is not an issue for you, you can override
 * this method to delete the property instead.
 *
 * @param {Object} obj
 * @param {String} prop
 */
ModelBase.omitImpl = function (obj, prop) {
  obj[prop] = undefined;
};

/**
 * @ignore
 * @param {string} columnName
 * @returns {string}
 */
ModelBase.columnNameToPropertyName = function (columnName) {
  this.$$ensurePropNameConversionCache();

  if (!this.$$colToProp[columnName]) {
    this.$$cachePropNameConversion(this.$$columnNameToPropertyName(columnName), columnName);
  }

  return this.$$colToProp[columnName];
};

/**
 * @ignore
 * @param {string} propertyName
 * @returns {string}
 */
ModelBase.propertyNameToColumnName = function (propertyName) {
  this.$$ensurePropNameConversionCache();

  if (!this.$$propToCol[propertyName]) {
    this.$$cachePropNameConversion(propertyName, this.$$propertyNameToColumnName(propertyName));
  }

  return this.$$propToCol[propertyName];
};

/**
 * @protected
 */
ModelBase.prototype.$$toJson = function (createDbJson, omit, pick) {
  var json = toJsonImpl(this, createDbJson, omit, pick);

  if (createDbJson) {
    return this.$formatDatabaseJson(json);
  } else {
    return this.$formatJson(json);
  }
};

/**
 * @private
 */
ModelBase.$$ensurePropNameConversionCache = function () {
  this.$$propToCol = this.$$propToCol || Object.create(null);
  this.$$colToProp = this.$$colToProp || Object.create(null);
};

/**
 * @private
 */
ModelBase.$$cachePropNameConversion = function (propertyName, columnName) {
  this.$$propToCol[propertyName] = columnName;
  this.$$colToProp[columnName] = propertyName;
};

/**
 * @private
 */
ModelBase.$$columnNameToPropertyName = function (columnName) {
  var row = {};
  var value = uuid.v4();

  row[columnName] = value;

  var model = this.fromDatabaseJson(row);
  var propertyName = _.findKey(model, function (val) {
    return val === value;
  });

  if (!propertyName && _.size(model) === 1) {
    propertyName = _.first(_.keys(model));
  }

  return propertyName || null;
};

/**
 * @private
 */
ModelBase.$$propertyNameToColumnName = function (propertyName) {
  var model = {};
  var value = uuid.v4();

  model[propertyName] = value;

  var row = this.fromJson(model, {skipValidation: true}).$toDatabaseJson();
  var columnName = _.findKey(row, function (val) {
    return val === value;
  });

  if (!columnName && _.size(row) === 1) {
    columnName = _.first(_.keys(row));
  }

  return columnName || null;
};

/**
 * @private
 */
function mergeWithDefaults(jsonSchema, json) {
  var merged = null;

  if (!jsonSchema) {
    return json;
  }

  // Check each schema property for default value.
  for (var key in jsonSchema.properties) {
    var prop = jsonSchema.properties[key];

    if (!_.has(json, key) && _.has(prop, 'default')) {
      if (merged === null) {
        // Only take expensive clone if needed.
        merged = _.cloneDeep(json);
      }

      if (_.isObject(prop.default)) {
        merged[key] = _.cloneDeep(prop.default);
      } else {
        merged[key] = prop.default;
      }
    }
  }

  if (merged === null) {
    return json;
  } else {
    return merged;
  }
}

/**
 * @private
 */
function tryValidate(jsonSchema, json, options) {
  var required;

  try {
    if (options.patch) {
      required = jsonSchema.required;
      jsonSchema.required = [];
    }

    return tv4.validateMultiple(json, jsonSchema);
  } finally {
    if (options.patch) {
      jsonSchema.required = required;
    }
  }
}

/**
 * @private
 */
function parseValidationError(report) {
  var errorHash = {};
  var index = 0;

  if (report.errors.length === 0) {
    return null;
  }

  for (var i = 0; i < report.errors.length; ++i) {
    var error = report.errors[i];
    var key = error.dataPath.split('/').slice(1).join('.');

    // Hack: The dataPath is empty for failed 'required' validations. We parse
    // the property name from the error message.
    if (!key && error.message.substring(0, 26) === 'Missing required property:') {
      key = error.message.split(':')[1].trim();
    }

    // If the validation failed because of extra properties, the key is an empty string. We
    // still want a unique error in the hash for each failure.
    if (!key) {
      key = (index++).toString();
    }

    errorHash[key] = error.message;
  }

  return new ValidationError(errorHash);
}

/**
 * @private
 */
function toJsonImpl(self, createDbJson, omit, pick) {
  var json = {};

  _.each(self, function toJsonImplLooper(value, key) {
    if (key.charAt(0) !== '$'
        && !_.isFunction(value)
        && !_.isUndefined(value)
        && (!omit || !omit[key])
        && (!pick || pick[key])) {

      if (_.isObject(value)) {
        json[key] = toJsonObject(value, createDbJson);
      } else {
        json[key] = value;
      }
    }
  });

  return json;
}

/**
 * @private
 */
function toJsonObject(value, createDbJson) {
  if (_.isArray(value)) {
    return toJsonArray(value, createDbJson);
  } else if (value instanceof ModelBase) {
    if (createDbJson) {
      return value.$toDatabaseJson();
    } else {
      return value.$toJson();
    }
  } else {
    return _.cloneDeep(value);
  }
}

/**
 * @private
 */
function toJsonArray(value, createDbJson) {
  return _.map(value, function toJsonArrayLooper(value) {
    return toJsonObject(value, createDbJson);
  });
}

/**
 * @private
 */
function cloneObject(value) {
  if (_.isArray(value)) {
    return cloneArray(value);
  } else if (value instanceof ModelBase) {
    return value.$clone();
  } else {
    return _.cloneDeep(value);
  }
}

/**
 * @private
 */
function cloneArray(value) {
  return _.map(value, function cloneArrayLooper(value) {
    return cloneObject(value);
  });
}

/**
 * @private
 */
function omitObject(model, keyObj) {
  var ModelClass = model.constructor;

  _.each(keyObj, function (value, key) {
    if (value && key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  });
}

/**
 * @private
 */
function omitArray(model, keys) {
  var ModelClass = model.constructor;

  _.each(keys, function (key) {
    if (key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  });
}

/**
 * @private
 */
function pickObject(model, keyObj) {
  var ModelClass = model.constructor;

  _.each(model, function (value, key) {
    if (key.charAt(0) !== '$' && !keyObj[key]) {
      ModelClass.omitImpl(model, key);
    }
  });
}

/**
 * @private
 */
function pickArray(model, keys) {
  var ModelClass = model.constructor;

  _.each(model, function (value, key) {
    if (key.charAt(0) !== '$' && !contains(keys, key)) {
      ModelClass.omitImpl(model, key);
    }
  });
}

/**
 * @private
 */
function contains(arr, value) {
  for (var i = 0, l = arr.length; i < l; ++i) {
    if (arr[i] === value) {
      return true;
    }
  }
  return false;
}

module.exports = ModelBase;
