'use strict';

// camelCase to snake_case converter that also works with
// non-ascii characters.
function snakeCase(str) {
  if (str.length === 0) {
    return str;
  }

  const upper = str.toUpperCase();
  const lower = str.toLowerCase();

  let out = str[0];

  for (let i = 1, l = str.length; i < l; ++i) {
    const char = str[i];
    const prevChar = str[i - 1];

    const upperChar = upper[i];
    const prevUpperChar = upper[i - 1];

    const lowerChar = lower[i];
    const prevLowerChar = lower[i - 1];

    // Test if `char` is an upper-case character and `prevChar` is not.
    // We ignore this character if `toUpperCase()` and `toLowerCase()`
    // are equal for either `char` or `prevChar` which means that they
    // don't have an upper case version.
    if (
      char === upperChar &&
      prevChar !== prevUpperChar &&
      upperChar !== lowerChar &&
      prevUpperChar !== prevLowerChar
    ) {
      out += '_' + lowerChar;
    } else {
      out += char;
    }
  }

  return out;
}

// snake_case to camelCase converter that simply reverses
// the actions done by `snakeCase` function.
function camelCase(str) {
  if (str.length === 0) {
    return str;
  }

  let out = str[0];

  for (let i = 1, l = str.length; i < l; ++i) {
    const char = str[i];
    const prevChar = str[i - 1];

    if (char !== '_') {
      if (prevChar === '_') {
        out += char.toUpperCase();
      } else {
        out += char;
      }
    }
  }

  return out;
}

// Super fast memoize for single argument functions.
function memoize(func) {
  const cache = new Map();

  return input => {
    let output = cache.get(input);

    if (output === undefined) {
      output = func(input);
      cache.set(input, output);
    }

    return output;
  };
}

function mapKeys(obj, mapper) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }

  const keys = Object.keys(obj);
  const out = {};

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];
    out[mapper(key)] = obj[key];
  }

  return out;
}

function knexSnakeCaseMappers() {
  const toSnakeCase = memoize(snakeCase);
  const toCamelCase = memoize(camelCase);

  return {
    wrapIdentifier(identifier, origWrap) {
      return origWrap(toSnakeCase(identifier));
    },

    postProcessResponse(result) {
      if (Array.isArray(result)) {
        const output = new Array(result.length);

        for (let i = 0, l = result.length; i < l; ++i) {
          output[i] = mapKeys(result[i], toCamelCase);
        }

        return output;
      } else if (typeof result === 'object') {
        return mapKeys(result, toCamelCase);
      } else {
        return result;
      }
    }
  };
}

module.exports = {
  snakeCase,
  camelCase,
  knexSnakeCaseMappers
};
