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
 * @property {Boolean} patch
 *    If true the json is treated as a patch and the `required` field of the json schema is
 *    ignored in the validation. This allows us to create models with a subset of required
 *    properties for patch operations.
 *
 * @property {Boolean} skipValidation
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
  // This function is never invoked if it hasn't been overridden. And if it has been
  // overridden it is also never called. So to sum up, this method is never called :D.
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
    jsonSchema = ModelClass.deepCloneJson(jsonSchema);
    jsonSchema = this.$beforeValidate(jsonSchema, json, options);
  }

  if (options.patch) {
    required = jsonSchema.required;
    jsonSchema.required = [];
  }

  var report = tv4.validateMultiple(json, jsonSchema);

  if (options.patch) {
    jsonSchema.required = required;
  }

  var validationError = this.$$parseValidationError(report);

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
  return this.$$toJson(true);
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
  return this.$$toJson(false);
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
  var ModelClass = this.constructor;

  if (!options.patch) {
    json = ModelClass.$$mergeWithDefaults(json);
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
  this.$set(json);
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
  var ModelClass = this.constructor;

  for (var key in obj) {
    if (ModelClass.hasOwnJsonProperty(obj, key)) {
      this[key] = obj[key];
    }
  }

  return this;
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
 * Takes a deep clone of a pure JSON object.
 */
ModelBase.deepCloneJson = function (json) {
  return _.cloneDeep(json);
};

/**
 * Returns true if object[key] is copyable to the model when converting from JSON to a model.
 *
 * By default the properties that start with '$' are ignored. This behaviour can be changed
 * by overriding this method.
 *
 * @param {Object} object
 * @param {String} key
 */
ModelBase.hasOwnJsonProperty = function (object, key) {
  return object.hasOwnProperty(key) && key.charAt(0) !== '$' && !_.isFunction(object[key]);
};

ModelBase.columnNameToPropertyName = function (columnName) {
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

ModelBase.propertyNameToColumnName = function (propertyName) {
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
 * Returns a deep copy of this model.
 *
 * If this object has instances of ModelBase as properties (or arrays of them)
 * they are cloned using their `.$clone()` method.
 *
 * @return {ModelBase}
 */
ModelBase.prototype.$clone = function () {
  var ModelClass = this.constructor;
  var copy = new ModelClass();

  for (var key in this) {
    if (!this.hasOwnProperty(key)) {
      continue;
    }

    var value = this[key];
    if (_.isArray(value)) {
      var arr = [];

      for (var i = 0, l = value.length; i < l; ++i) {
        if (value[i] instanceof ModelBase) {
          arr.push(value[i].$clone());
        } else {
          arr.push(ModelClass.deepCloneJson(value[i]));
        }
      }

      copy[key] = arr;
    } else if (_.isObject(value)) {
      if (value instanceof ModelBase) {
        copy[key] = value.$clone();
      } else {
        copy[key] = ModelClass.deepCloneJson(value);
      }
    } else {
      copy[key] = value;
    }
  }

  return copy;
};

/**
 * @private
 */
ModelBase.prototype.$$toJson = function (createDbJson) {
  var ModelClass = this.constructor;
  var json = {};

  for (var key in this) {
    if (!ModelClass.hasOwnJsonProperty(this, key)) {
      continue;
    }

    var value = this[key];
    if (_.isArray(value)) {
      var arr = [];

      for (var i = 0, l = value.length; i < l; ++i) {
        if (value[i] instanceof ModelBase) {
          arr.push(value[i].$$toJson(createDbJson));
        } else {
          arr.push(ModelClass.deepCloneJson(value[i]));
        }
      }

      json[key] = arr;
    } else if (_.isObject(value)) {
      if (value instanceof ModelBase) {
        json[key] = value.$$toJson(createDbJson);
      } else {
        json[key] = ModelClass.deepCloneJson(value);
      }
    } else {
      json[key] = value;
    }
  }

  if (createDbJson) {
    return this.$formatDatabaseJson(json);
  } else {
    return this.$formatJson(json);
  }
};

/**
 * @private
 */
ModelBase.$$mergeWithDefaults = function (json) {
  var jsonSchema = this.jsonSchema;
  var merged = null;

  if (!jsonSchema) {
    return json;
  }

  var props = jsonSchema.properties;
  // Check each schema property for default value.
  for (var key in props) {
    if (props.hasOwnProperty(key) && !_.has(json, key)) {
      var prop = props[key];

      if (_.has(prop, 'default')) {
        if (merged === null) {
          // Only take expensive clone if needed.
          merged = this.deepCloneJson(json);
        }

        if (_.isObject(prop.default)) {
          merged[key] = this.deepCloneJson(prop.default);
        } else {
          merged[key] = prop.default;
        }
      }
    }
  }

  if (merged === null) {
    return json;
  } else {
    return merged;
  }
};

/**
 * @private
 */
ModelBase.prototype.$$parseValidationError = function (report) {
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
};

module.exports = ModelBase;
