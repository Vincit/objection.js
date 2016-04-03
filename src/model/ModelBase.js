import _ from 'lodash';
import tv4 from 'tv4';
import tv4Formats from 'tv4-formats';
import ValidationError from '../ValidationError';
import hiddenDataGetterSetter from '../utils/decorators/hiddenDataGetterSetter';
import splitQueryProps from '../utils/splitQueryProps';
import {inherits} from '../utils/classUtils';
import memoize from '../utils/decorators/memoize';

/**
 * @typedef {Object} ModelOptions
 *
 * @property {boolean} [patch]
 * @property {boolean} [skipValidation]
 */

export default class ModelBase {

  /**
   * @type {Object}
   */
  static jsonSchema = null;

  /**
   * @param {Object} jsonSchema
   * @param {Object} json
   * @param {ModelOptions=} options
   * @return {Object}
   */
  $beforeValidate(jsonSchema, json, options) {
    /* istanbul ignore next */
    return jsonSchema;
  }

  /**
   * @throws {ValidationError}
   * @param {Object=} json
   * @param {ModelOptions=} options
   * @return {Object}
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
   * @param {Object=} json
   * @param {ModelOptions=} options
   */
  $afterValidate(json, options) {
    // Do nothing by default.
  }

  /**
   * @param {Object} json
   * @return {Object}
   */
  $parseDatabaseJson(json) {
    return json;
  }

  /**
   * @param {Object} json
   * @return {Object}
   */
  $formatDatabaseJson(json) {
    return json;
  }

  /**
   * @param {Object} json
   * @param {ModelOptions=} options
   * @return {Object}
   */
  $parseJson(json, options) {
    return json;
  }

  /**
   * @param {Object} json
   * @return {Object}
   */
  $formatJson(json) {
    return json;
  }

  /**
   * @return {Object}
   */
  $toDatabaseJson() {
    return this.$$toJson(true, null, null);
  }

  /**
   * @return {Object}
   */
  $toJson() {
    return this.$$toJson(false, null, null);
  }

  toJSON() {
    return this.$toJson();
  }

  /**
   * @param {Object} json
   * @param {ModelOptions=} options
   * @returns {ModelBase}
   * @throws ValidationError
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

    // If the json contains query properties like, knex Raw queries or knex/objection query
    // builders, we need to split those off into a separate object. This object will be
    // joined back in the $toDatabaseJson method.
    const split = splitQueryProps(this.constructor, json);

    if (split.query) {
      // Stash the query properties for later use in $toDatabaseJson method.
      this.$stashedQueryProps(split.query);
    }

    split.json = this.$parseJson(split.json, options);
    split.json = this.$validate(split.json, options);

    return this.$set(split.json);
  }

  /**
   * @param {Object} json
   * @returns {ModelBase}
   */
  $setDatabaseJson(json = {}) {
    json = this.$parseDatabaseJson(json);

    for (let key in json) {
      this[key] = json[key];
    }

    return this;
  }

  /**
   * @param {Object} obj
   * @returns {ModelBase}
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
   * @param {Array.<string>=} keys
   * @returns {Array.<string>}
   */
  @hiddenDataGetterSetter('omitFromJson')
  $omitFromJson(keys) {}

  /**
   * @param {Array.<string>=} keys
   * @returns {Array.<string>}
   */
  @hiddenDataGetterSetter('omitFromDatabaseJson')
  $omitFromDatabaseJson(keys) {}

  /**
   * @param {Object=} queryProps
   * @returns {Object}
   */
  @hiddenDataGetterSetter('stashedQueryProps')
  $stashedQueryProps(queryProps) {}

  /**
   * @param {string|Array.<string>|Object.<string, boolean>} keys
   * @returns {ModelBase}
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
   * @param {function=} subclassConstructor
   * @return {Constructor.<ModelBase>}
   */
  static extend(subclassConstructor) {
    if (_.isEmpty(subclassConstructor.name)) {
      throw new Error('Each ModelBase subclass constructor must have a name');
    }

    inherits(subclassConstructor, this);
    return subclassConstructor;
  }

  /**
   * @param {Object=} json
   * @param {ModelOptions=} options
   * @returns {Model}
   * @throws ValidationError
   */
  static fromJson(json, options) {
    let model = new this();
    model.$setJson(json || {}, options);
    return model;
  }

  /**
   * @param {Object=} json
   * @returns {Model}
   */
  static fromDatabaseJson(json) {
    let model = new this();
    model.$setDatabaseJson(json || {});
    return model;
  }

  /**
   * @param {Object} obj
   * @param {string} prop
   */
  static omitImpl(obj, prop) {
    obj[prop] = undefined;
  }

  /**
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

function toJsonImpl(model, createDbJson, omit, pick) {
  let json = {};

  const omitFromJson = createDbJson
    ? model.$omitFromDatabaseJson()
    : model.$omitFromJson();

  if (createDbJson) {
    // If creating a database json object, restore the query properties.
    _.each(model.$stashedQueryProps(), (query, key) => {
      json[key] = query;
    });
  }

  _.each(model, (value, key) => {
    if (key.charAt(0) !== '$'
      && !_.isFunction(value)
      && !_.isUndefined(value)
      && (!omit || !omit[key])
      && (!pick || pick[key])
      && (!omitFromJson || !contains(omitFromJson, key))) {

      if (_.isObject(value)) {
        json[key] = toJsonObject(value, createDbJson);
      } else {
        json[key] = value;
      }
    }
  });

  return json;
}

function toJsonObject(value, createDbJson) {
  if (_.isArray(value)) {
    return toJsonArray(value, createDbJson);
  } else if (value instanceof ModelBase) {
    if (createDbJson) {
      return value.$toDatabaseJson();
    } else {
      return value.$toJson();
    }
  } else if (Buffer.isBuffer(value)) {
    return value;
  } else {
    return _.cloneDeep(value);
  }
}

function toJsonArray(value, createDbJson) {
  return _.map(value, (value) => toJsonObject(value, createDbJson));
}

function cloneObject(value) {
  if (_.isArray(value)) {
    return cloneArray(value);
  } else if (value instanceof ModelBase) {
    return value.$clone();
  } else if (Buffer.isBuffer(value)) {
    return new Buffer(value);
  } else {
    return _.cloneDeep(value);
  }
}

function cloneArray(value) {
  return _.map(value, cloneObject);
}

function omitObject(model, keyObj) {
  const ModelClass = model.constructor;

  _.each(keyObj, (value, key) => {
    if (value && key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  });
}

function omitArray(model, keys) {
  const ModelClass = model.constructor;

  _.each(keys, (key) => {
    if (key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  });
}

function pickObject(model, keyObj) {
  const ModelClass = model.constructor;

  _.each(model, (value, key) => {
    if (key.charAt(0) !== '$' && !keyObj[key]) {
      ModelClass.omitImpl(model, key);
    }
  });
}

function pickArray(model, keys) {
  const ModelClass = model.constructor;

  _.each(model, (value, key) => {
    if (key.charAt(0) !== '$' && !contains(keys, key)) {
      ModelClass.omitImpl(model, key);
    }
  });
}

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