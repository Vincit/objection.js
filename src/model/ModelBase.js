import _ from 'lodash';
import tv4 from 'tv4';
import tv4Formats from 'tv4-formats';
import ValidationError from '../ValidationError';
import {inherits} from '../utils/classUtils';
import {memoize} from '../utils/decorators';

/**
 * @typedef {Object} ModelOptions
 *
 * @property {boolean} [patch]
 *    If true the json is treated as a patch and the `required` field of the json schema is
 *    ignored in the validation. This allows us to create models with a subset of required
 *    properties for patch operations.
 *
 * @property {boolean} [skipValidation]
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
export default class ModelBase {

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
  static jsonSchema = null;

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
  $beforeValidate(jsonSchema, json, options) {
    /* istanbul ignore next */
    return jsonSchema;
  }

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
  $validate(json = this, options = {}) {
    const ModelClass = this.constructor;
    let jsonSchema = ModelClass.jsonSchema;

    if (!jsonSchema || options.skipValidation) {
      return json;
    }

    // No need to call $beforeValidate (and clone the jsonSchema) if $beforeValidate has not been overwritten.
    if (this.$beforeValidate !== ModelBase.prototype.$beforeValidate) {
      jsonSchema = _.cloneDeep(jsonSchema);
      jsonSchema = this.$beforeValidate(jsonSchema, json, options);
    }

    let report = tryValidate(jsonSchema, json, options);
    let validationError = parseValidationError(report);

    if (validationError) {
      throw validationError;
    }

    this.$afterValidate(json, options);
    return json;
  }

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
  $afterValidate(json, options) {
    // Do nothing by default.
  }

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
  $parseDatabaseJson(json) {
    return json;
  }

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
  $formatDatabaseJson(json) {
    return json;
  }

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
  $parseJson(json, options) {
    return json;
  }

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
  $formatJson(json) {
    return json;
  }

  /**
   * Exports this model as a database JSON object.
   *
   * Calls `$formatDatabaseJson()`.
   *
   * @return {Object}
   *    This model as a JSON object in database format.
   */
  $toDatabaseJson() {
    return this.$$toJson(true, null, null);
  }

  /**
   * Exports this model as a JSON object.
   *
   * Calls `$formatJson()`.
   *
   * @return {Object}
   *    This model as a JSON object.
   */
  $toJson() {
    return this.$$toJson(false, null, null);
  }

  /**
   * Alias for `this.$toJson()`.
   *
   * For JSON.stringify compatibility.
   */
  toJSON() {
    return this.$toJson();
  }

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
   * @returns {ModelBase} `this` for chaining.
   *
   * @throws ValidationError
   *    If validation fails.
   */
  $setJson(json, options = {}) {
    json = json || {};

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

    return this.$set(json);
  }

  /**
   * Sets the values from a JSON object in database format.
   *
   * Calls `this.$parseDatabaseJson()`.
   *
   * @param {Object} json
   *    The JSON object in database format.
   *
   * @returns {ModelBase} `this` for chaining.
   */
  $setDatabaseJson(json = {}) {
    json = this.$parseDatabaseJson(json);

    for (let key in json) {
      this[key] = json[key];
    }

    return this;
  }

  /**
   * Sets the values from another model or object.
   *
   * Unlike $setJson, this doesn't call any `$parseJson` methods or validate the input.
   * This simply sets each value in the object to this object.
   *
   * @param {Object} obj
   * @returns {ModelBase} `this` for chaining.
   */
  $set(obj) {
    const self = this;

    _.each(obj, (value, key) => {
      if (key.charAt(0) !== '$' && !_.isFunction(value)) {
        self[key] = value;
      }
    });

    return this;
  }

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
   *   .$omit(['lastName'])
   *   .toJSON();
   *
   * console.log(_.has(json, 'lastName')); // --> false
   * ```
   *
   * ```js
   * var json = person
   *   .fromJson({firstName: 'Jennifer', lastName: 'Lawrence', age: 24})
   *   .$omit({lastName: true})
   *   .toJSON();
   *
   * console.log(_.has(json, 'lastName')); // --> false
   * ```
   *
   * @param {string|Array.<string>|Object.<string, boolean>} keys
   * @returns {ModelBase} `this` for chaining.
   */
  $omit() {
    if (arguments.length === 1 && _.isObject(arguments[0])) {
      let keys = arguments[0];

      if (_.isArray(keys)) {
        omitArray(this, keys);
      } else {
        omitObject(this, keys);
      }
    } else {
      omitArray(this, _.toArray(arguments));
    }

    return this;
  }

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
   * @param {string|Array.<string>|Object.<string, boolean>} keys
   * @returns {ModelBase} `this` for chaining.
   */
  $pick() {
    if (arguments.length === 1 && _.isObject(arguments[0])) {
      let keys = arguments[0];

      if (_.isArray(keys)) {
        pickArray(this, keys);
      } else {
        pickObject(this, keys);
      }
    } else {
      pickArray(this, _.toArray(arguments));
    }

    return this;
  }

  /**
   * Returns the values of the given properties as an array.
   *
   * @param {Array.<string>} props
   * @return {Array.<*>}
   */
  $values() {
    if (arguments.length === 0) {
      return _.values(this);
    } else if (arguments.length === 1 && _.isArray(arguments[0])) {
      return _.map(arguments[0], prop => this[prop]);
    } else {
      return _.map(arguments, prop => this[prop]);
    }
  }

  /**
   * Returns a deep copy of this model.
   *
   * If this object has instances of ModelBase as properties (or arrays of them)
   * they are cloned using their `.$clone()` method.
   *
   * @return {ModelBase}
   */
  $clone() {
    const clone = new this.constructor();

    _.each(this, (value, key) => {
      if (_.isObject(value)) {
        clone[key] = cloneObject(value);
      } else {
        clone[key] = value;
      }
    });

    return clone;
  }

  /**
   * @protected
   */
  $$toJson(createDbJson, omit, pick) {
    let json = toJsonImpl(this, createDbJson, omit, pick);

    if (createDbJson) {
      return this.$formatDatabaseJson(json);
    } else {
      return this.$formatJson(json);
    }
  }

  /**
   * Makes the given constructor a subclass of this class.
   *
   * @param {function=} subclassConstructor
   * @return {function}
   */
  static extend(subclassConstructor) {
    if (_.isEmpty(subclassConstructor.name)) {
      throw new Error('Each ModelBase subclass constructor must have a name');
    }

    inherits(subclassConstructor, this);
    return subclassConstructor;
  }

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
   * @returns {Model}
   *
   * @throws ValidationError
   *    If validation fails.
   */
  static fromJson(json, options) {
    let model = new this();
    model.$setJson(json || {}, options);
    return model;
  }

  /**
   * Creates a model instance from a JSON object in database format.
   *
   * @param {Object=} json
   *    The JSON from which to create the model.
   *
   * @returns {Model}
   */
  static fromDatabaseJson(json) {
    let model = new this();
    model.$setDatabaseJson(json || {});
    return model;
  }

  /**
   * Omit implementation to use.
   *
   * The default just sets the property to undefined for performance reasons.
   * If the slight performance drop is not an issue for you, you can override
   * this method to delete the property instead.
   *
   * @param {Object} obj
   * @param {string} prop
   */
  static omitImpl(obj, prop) {
    obj[prop] = undefined;
  }

  /**
   * @ignore
   * @param {string} columnName
   * @returns {string}
   */
  @memoize
  static columnNameToPropertyName(columnName) {
    let model = new this();
    let addedProps = _.keys(model.$parseDatabaseJson({}));

    let row = {};
    row[columnName] = null;

    let props = _.keys(_.omit(model.$parseDatabaseJson(row), addedProps));
    let propertyName = _.first(props);

    return propertyName || null;
  }

  /**
   * @ignore
   * @param {string} propertyName
   * @returns {string}
   */
  @memoize
  static propertyNameToColumnName(propertyName) {
    let model = new this();
    let addedCols = _.keys(model.$formatDatabaseJson({}));

    let obj = {};
    obj[propertyName] = null;

    let cols = _.keys(_.omit(model.$formatDatabaseJson(obj), addedCols));
    let columnName = _.first(cols);

    return columnName || null;
  }
}

/**
 * @private
 */
function mergeWithDefaults(jsonSchema, json) {
  let merged = null;

  if (!jsonSchema) {
    return json;
  }

  // Check each schema property for default value.
  for (let key in jsonSchema.properties) {
    let prop = jsonSchema.properties[key];

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
  let required;

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
  let errorHash = {};
  let index = 0;

  if (report.errors.length === 0) {
    return null;
  }

  for (let i = 0; i < report.errors.length; ++i) {
    let error = report.errors[i];
    let key = error.dataPath.split('/').slice(1).join('.');

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
  let json = {};

  _.each(self, (value, key) => {
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
  return _.map(value, (value) => toJsonObject(value, createDbJson));
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
  return _.map(value, cloneObject);
}

/**
 * @private
 */
function omitObject(model, keyObj) {
  const ModelClass = model.constructor;

  _.each(keyObj, (value, key) => {
    if (value && key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  });
}

/**
 * @private
 */
function omitArray(model, keys) {
  const ModelClass = model.constructor;

  _.each(keys, (key) => {
    if (key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  });
}

/**
 * @private
 */
function pickObject(model, keyObj) {
  const ModelClass = model.constructor;

  _.each(model, (value, key) => {
    if (key.charAt(0) !== '$' && !keyObj[key]) {
      ModelClass.omitImpl(model, key);
    }
  });
}

/**
 * @private
 */
function pickArray(model, keys) {
  const ModelClass = model.constructor;

  _.each(model, (value, key) => {
    if (key.charAt(0) !== '$' && !contains(keys, key)) {
      ModelClass.omitImpl(model, key);
    }
  });
}

/**
 * @private
 */
function contains(arr, value) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    if (arr[i] === value) {
      return true;
    }
  }
  return false;
}

// Add validation formats, so that for example the following schema validation works:
// createTime: {type: 'string', format: 'date-time'}
tv4.addFormat(tv4Formats);