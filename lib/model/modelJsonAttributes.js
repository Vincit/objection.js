'use strict';

const flattenDeep = require('lodash/flattenDeep');
const asArray = require('../utils/objectUtils').asArray;

function parseJsonAttributes(json, ModelClass) {
  const jsonAttr = ModelClass.getJsonAttributes();

  if (jsonAttr.length) {
    // JSON attributes may be returned as strings depending on the database and
    // the database client. Convert them to objects here.
    for (let i = 0, l = jsonAttr.length; i < l; ++i) {
      const attr = jsonAttr[i];
      const value = json[attr];

      if (typeof value === 'string') {
        const parsed = tryParseJson(value);

        // tryParseJson returns undefined if parsing failed.
        if (parsed !== undefined) {
          json[attr] = parsed;
        }
      }
    }
  }

  return json;
}

function formatJsonAttributes(json, ModelClass) {
  const jsonAttr = ModelClass.getJsonAttributes();

  if (jsonAttr.length) {
    // All database clients want JSON columns as strings. Do the conversion here.
    for (let i = 0, l = jsonAttr.length; i < l; ++i) {
      const attr = jsonAttr[i];
      const value = json[attr];

      if (value && typeof value === 'object') {
        json[attr] = JSON.stringify(value);
      }
    }
  }

  return json;
}

function getJsonAttributes(ModelClass) {
  let jsonAttributes = ModelClass.jsonAttributes;

  if (Array.isArray(jsonAttributes)) {
    return jsonAttributes;
  }

  jsonAttributes = [];

  if (ModelClass.getJsonSchema()) {
    const props = ModelClass.getJsonSchema().properties || {};
    const propNames = Object.keys(props);

    for (let i = 0, l = propNames.length; i < l; ++i) {
      const propName = propNames[i];
      const prop = props[propName];
      let types = asArray(prop.type).filter(it => !!it);

      if (types.length === 0 && Array.isArray(prop.anyOf)) {
        types = flattenDeep(prop.anyOf.map(it => it.type));
      }

      if (types.length === 0 && Array.isArray(prop.oneOf)) {
        types = flattenDeep(prop.oneOf.map(it => it.type));
      }

      if (types.indexOf('object') !== -1 || types.indexOf('array') !== -1) {
        jsonAttributes.push(propName);
      }
    }
  }

  return jsonAttributes;
}

function tryParseJson(maybeJsonStr) {
  try {
    return JSON.parse(maybeJsonStr);
  } catch (err) {
    return undefined;
  }
}

module.exports = {
  parseJsonAttributes,
  formatJsonAttributes,
  getJsonAttributes
};
