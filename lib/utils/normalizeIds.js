'use strict';

const isObject = require('lodash/isObject');
const zipObject = require('lodash/zipObject');

module.exports = (ids, expectedProperties, opt) => {
  opt = opt || {};

  if (!Array.isArray(expectedProperties)) {
    throw new Error(`expected expectedProperties to be an array, got ${expectedProperties}`);
  }

  if (expectedProperties.length === 0) {
    throw new Error(`expectedProperties must not be empty`);
  }

  let isComposite = expectedProperties.length > 1;
  let ret;

  if (isComposite) {
    // For composite ids these are okay:
    //
    // 1. [1, 'foo', 4]
    // 2. {a: 1, b: 'foo', c: 4}
    // 3. [[1, 'foo', 4], [4, 'bar', 1]]
    // 4. [{a: 1, b: 'foo', c: 4}, {a: 4, b: 'bar', c: 1}]
    //
    if (Array.isArray(ids)) {
      if (Array.isArray(ids[0])) {
        ret = new Array(ids.length);

        // 3.
        for (let i = 0, l = ids.length; i < l; ++i) {
          ret[i] = convertIdArrayToObject(ids[i], expectedProperties)
        }
      } else if (isObject(ids[0])) {
        ret = new Array(ids.length);

        // 4.
        for (let i = 0, l = ids.length; i < l; ++i) {
          ret[i] = ensureObject(ids[i], expectedProperties)
        }
      } else {
        // 1.
        ret = [convertIdArrayToObject(ids, expectedProperties)];
      }
    } else if (isObject(ids)) {
      // 2.
      ret = [ids];
    } else {
      throw new Error(`invalid composite key ${JSON.stringify(ids)}`);
    }
  } else {
    // For non-composite ids, these are okay:
    //
    // 1. 1
    // 2. {id: 1}
    // 3. [1, 'foo', 4]
    // 4. [{id: 1}, {id: 'foo'}, {id: 4}]
    //
    if (Array.isArray(ids)) {
      if (isObject(ids[0])) {
        ret = new Array(ids.length);

        // 4.
        for (let i = 0, l = ids.length; i < l; ++i) {
          ret[i] = ensureObject(ids[i]);
        }
      } else {
        ret = new Array(ids.length);

        // 3.
        for (let i = 0, l = ids.length; i < l; ++i) {
          ret[i] = {[expectedProperties[0]]: ids[i]};
        }
      }
    } else if (isObject(ids)) {
      // 2.
      ret = [ids];
    } else {
      // 1.
      const obj = {};
      obj[expectedProperties[0]] = ids;
      ret = [obj];
    }
  }

  checkProperties(ret, expectedProperties);

  if (opt.arrayOutput) {
    return normalizedToArray(ret, expectedProperties);
  } else {
    return ret;
  }
};

function convertIdArrayToObject(ids, expectedProperties) {
  if (!Array.isArray(ids)) {
    throw new Error(`invalid composite key ${JSON.stringify(ids)}`);
  }

  if (ids.length != expectedProperties.length) {
    throw new Error(`composite identifier ${JSON.stringify(ids)} should have ${expectedProperties.length} values`);
  }

  return zipObject(expectedProperties, ids);
}

function ensureObject(ids) {
  if (isObject(ids)) {
    return ids;
  } else {
    throw new Error(`invalid composite key ${JSON.stringify(ids)}`);
  }
}

function checkProperties(ret, expectedProperties) {
  for (let i = 0, l = ret.length; i < l; ++i) {
    const obj = ret[i];

    for (let j = 0, lp = expectedProperties.length; j < lp; ++j) {
      const prop = expectedProperties[j];

      if (typeof obj[prop] === 'undefined') {
        throw new Error(`expected id ${JSON.stringify(obj)} to have property ${prop}`);
      }
    }
  }
}

function normalizedToArray(ret, expectedProperties) {
  let arr = new Array(ret.length);

  for (let i = 0, l = ret.length; i < l; ++i) {
    const obj = ret[i];
    const ids = new Array(expectedProperties.length);

    for (let j = 0, lp = expectedProperties.length; j < lp; ++j) {
      const prop = expectedProperties[j];
      ids[j] = obj[prop];
    }

    arr[i] = ids;
  }

  return arr;
}