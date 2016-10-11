import _ from 'lodash';
import Ajv from 'ajv';
import hiddenData from '../utils/decorators/hiddenData';
import ValidationError from '../ValidationError';
import splitQueryProps from '../utils/splitQueryProps';
import {inherits} from '../utils/classUtils';
import memoize from '../utils/decorators/memoize';

const ajv = new Ajv({allErrors: true, validateSchema: false, ownProperties: true});
const ajvCache = Object.create(null);

/**
 * @typedef {Object} ModelOptions
 *
 * @property {boolean} [patch]
 * @property {boolean} [skipValidation]
 * @property {Model} [old]
 */

export default class ModelBase {

  /**
   * @type {Object}
   */
  static jsonSchema = null;

  /**
   * @type {Array.<string>}
   */
  static virtualAttributes = null;

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
   * @param {Object=} json
   * @param {ModelOptions=} options
   * @throws {ValidationError}
   * @return {Object}
   */
  $validate(json = this, options = {}) {
    let jsonSchema = this.constructor.getJsonSchema();

    if (!jsonSchema || options.skipValidation) {
      return json;
    }

    // No need to call $beforeValidate (and clone the jsonSchema) if $beforeValidate has not been overwritten.
    if (this.$beforeValidate !== ModelBase.prototype.$beforeValidate) {
      jsonSchema = _.cloneDeep(jsonSchema);
      jsonSchema = this.$beforeValidate(jsonSchema, json, options);
    }

    const validator = this.constructor.getJsonSchemaValidator(jsonSchema, options.patch);
    validator(json);

    if (validator.errors) {
      throw parseValidationError(validator.errors);
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
      json = mergeWithDefaults(this.constructor.getJsonSchema(), json);
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
  $setDatabaseJson(json) {
    json = this.$parseDatabaseJson(json);

    if (json) {
      const keys = Object.keys(json);

      for (let i = 0, l = keys.length; i < l; ++i) {
        const key = keys[i];
        this[key] = json[key];
      }
    }

    return this;
  }

  /**
   * @param {Object} obj
   * @returns {ModelBase}
   */
  $set(obj) {
    if (obj) {
      const keys = Object.keys(obj);

      for (let i = 0, l = keys.length; i < l; ++i) {
        const key = keys[i];
        const value = obj[key];

        if (key.charAt(0) !== '$' && typeof value !== 'function') {
          this[key] = value;
        }
      }
    }

    return this;
  }

  /**
   * @param {Array.<string>=} keys
   * @returns {Array.<string>}
   */
  @hiddenData({name: 'omitFromJson', append: true})
  $omitFromJson(keys) {}

  /**
   * @param {Array.<string>=} keys
   * @returns {Array.<string>}
   */
  @hiddenData({name: 'omitFromDatabaseJson', append: true})
  $omitFromDatabaseJson(keys) {}

  /**
   * @param {Object=} queryProps
   * @returns {Object}
   */
  @hiddenData('stashedQueryProps')
  $stashedQueryProps(queryProps) {}

  /**
   * @param {string|Array.<string>|Object.<string, boolean>} keys
   * @returns {ModelBase}
   */
  $omit() {
    if (arguments.length === 1 && _.isObject(arguments[0])) {
      let keys = arguments[0];

      if (Array.isArray(keys)) {
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

      if (Array.isArray(keys)) {
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
    } else {
      const args = (arguments.length === 1 && Array.isArray(arguments[0]))
        ? arguments[0]
        : arguments;

      switch (args.length) {
        case 1: return [this[args[0]]];
        case 2: return [this[args[0]], this[args[1]]];
        case 3: return [this[args[0]], this[args[1]], this[args[2]]];
        default: {
          const ret = new Array(args.length);

          for (let i = 0, l = args.length; i < l; ++i) {
            ret[i] = this[args[i]];
          }

          return ret;
        }
      }
    }
  }

  /**
   * @param {Array.<string>} props
   * @return {string}
   */
  $propKey(props) {
    switch (props.length) {
      case 1: return this[props[0]] + '';
      case 2: return this[props[0]] + ',' + this[props[1]];
      case 3: return this[props[0]] + ',' + this[props[1]] + ',' + this[props[2]];
      default: {
        let key = '';

        for (let i = 0, l = props.length; i < l; ++i) {
          key += this[props[i]] + ((i < props.length - 1) ? ',' : '');
        }

        return key;
      }
    }
  }

  /**
   * @return {ModelBase}
   */
  $clone() {
    const clone = new this.constructor();
    const keys = Object.keys(this);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      const value = this[key];

      if (_.isObject(value)) {
        clone[key] = cloneObject(value);
      } else {
        clone[key] = value;
      }
    }

    if (this.$omitFromDatabaseJson()) {
      clone.$omitFromDatabaseJson(this.$omitFromDatabaseJson());
    }

    if (this.$omitFromJson()) {
      clone.$omitFromJson(this.$omitFromJson());
    }

    if (this.$stashedQueryProps()) {
      clone.$stashedQueryProps(this.$stashedQueryProps());
    }

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
    delete obj[prop];
  }

  /**
   * @param {Object} jsonSchema
   * @param {boolean} skipRequired
   * @returns {function}
   */
  static getJsonSchemaValidator(jsonSchema, skipRequired) {
    skipRequired = !!skipRequired;

    if (jsonSchema === this.getJsonSchema()) {
      // Fast path for the common case: the json schema is never modified.
      return this.getDefaultJsonSchemaValidator(skipRequired);
    } else {
      let key = JSON.stringify(jsonSchema);
      let validators = ajvCache[key];

      if (!validators) {
        validators = {};
        ajvCache[key] = validators;
      }

      let validator = validators[skipRequired];
      if (!validator) {
        validator = compileJsonSchemaValidator(jsonSchema, skipRequired);
        validators[skipRequired] = validator;
      }

      return validator;
    }
  }

  @memoize
  static getJsonSchema() {
    // Memoized getter in case jsonSchema is a getter property (usually is with ES6).
    return this.jsonSchema;
  }

  /**
   * @returns {function}
   */
  @memoize
  static getDefaultJsonSchemaValidator(skipRequired) {
    return compileJsonSchemaValidator(this.getJsonSchema(), skipRequired);
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

    let props = _.keys(model.$parseDatabaseJson(row));
    let propertyName = _.first(_.difference(props, addedProps));

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

    let cols = _.keys(model.$formatDatabaseJson(obj));
    let columnName = _.first(_.difference(cols, addedCols));

    return columnName || null;
  }
}

function mergeWithDefaults(jsonSchema, json) {
  let merged = null;

  if (!jsonSchema) {
    return json;
  }

  if (!jsonSchema.properties) {
    return json;
  }

  const propNames = Object.keys(jsonSchema.properties);
  // Check each schema property for default value.
  for (let i = 0, l = propNames.length; i < l; ++i) {
    const propName = propNames[i];
    const prop = jsonSchema.properties[propName];

    if (!_.has(json, propName) && _.has(prop, 'default')) {
      if (merged === null) {
        // Only take expensive clone if needed.
        merged = _.cloneDeep(json);
      }

      if (_.isObject(prop.default)) {
        merged[propName] = _.cloneDeep(prop.default);
      } else {
        merged[propName] = prop.default;
      }
    }
  }

  if (merged === null) {
    return json;
  } else {
    return merged;
  }
}

function parseValidationError(errors) {
  let errorHash = {};
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

    errorHash[key] = error.message;
  }

  return new ValidationError(errorHash);
}

function toJsonImpl(model, createDbJson, omit, pick) {
  if (createDbJson) {
    return toDatabaseJsonImpl(model, omit, pick);
  } else {
    return toExternalJsonImpl(model, omit, pick);
  }
}

function toDatabaseJsonImpl(model, omit, pick) {
  let json = {};
  const omitFromJson = model.$omitFromDatabaseJson();
  const stash = model.$stashedQueryProps();

  if (stash) {
    const keys = Object.keys(stash);

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      json[key] = stash[key];
    }
  }

  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    assignJsonValue(json, key, model[key], omit, pick, omitFromJson, true);
  }

  return json;
}

function toExternalJsonImpl(model, omit, pick) {
  const json = {};
  const omitFromJson = model.$omitFromJson();
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    assignJsonValue(json, key, model[key], omit, pick, omitFromJson, false);
  }

  if (model.constructor.virtualAttributes) {
    const vAttr = model.constructor.virtualAttributes;

    for (let i = 0, l = vAttr.length; i < l; ++i) {
      const key = vAttr[i];
      let value = model[key];

      if (_.isFunction(value)) {
        value = value.call(model);
      }

      assignJsonValue(json, key, value, omit, pick, omitFromJson, false);
    }
  }

  return json;
}

function assignJsonValue(json, key, value, omit, pick, omitFromJson, createDbJson) {
  if (key.charAt(0) !== '$'
    && !_.isFunction(value)
    && !_.isUndefined(value)
    && (!omit || !omit[key])
    && (!pick || pick[key])
    && (!omitFromJson || !contains(omitFromJson, key))) {

    if (value !== null && typeof value === 'object') {
      json[key] = toJsonObject(value, createDbJson);
    } else {
      json[key] = value;
    }
  }
}

function toJsonObject(value, createDbJson) {
  if (Array.isArray(value)) {
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
  const ret = new Array(value.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    ret[i] = toJsonObject(value[i], createDbJson)
  }

  return ret;
}

function cloneObject(value) {
  if (Array.isArray(value)) {
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
  const ret = new Array(value.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    ret[i] = cloneObject(value[i])
  }

  return ret;
}

function omitObject(model, keyObj) {
  const ModelClass = model.constructor;
  const keys = Object.keys(keyObj);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    const value = keyObj[key];

    if (value && key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function omitArray(model, keys) {
  const ModelClass = model.constructor;

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && _.has(model, key)) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function pickObject(model, keyObj) {
  const ModelClass = model.constructor;
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && !keyObj[key]) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function pickArray(model, pick) {
  const ModelClass = model.constructor;
  const keys = Object.keys(model);

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (key.charAt(0) !== '$' && !contains(pick, key)) {
      ModelClass.omitImpl(model, key);
    }
  }
}

function contains(arr, value) {
  for (let i = 0, l = arr.length; i < l; ++i) {
    if (arr[i] === value) {
      return true;
    }
  }
  return false;
}

function compileJsonSchemaValidator(jsonSchema, skipRequired) {
  let origRequired;

  try {
    if (skipRequired) {
      origRequired = jsonSchema.required;
      jsonSchema.required = [];
    }

    return ajv.compile(jsonSchema);
  } finally {
    if (skipRequired) {
      jsonSchema.required = origRequired;
    }
  }
}
