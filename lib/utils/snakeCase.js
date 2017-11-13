'use strict';

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

// camelCase to snake_case converter that also works with
// non-ascii characters.
const snakeCase = memoize(str => {
  if (str.length === 0) {
    return str;
  }

  const upper = str.toUpperCase();
  const lower = str.toLowerCase();

  let out = lower[0];

  for (let i = 1, l = str.length; i < l; ++i) {
    const char = str[i];
    const prevChar = str[i - 1];

    const upperChar = upper[i];
    const prevUpperChar = upper[i - 1];

    const lowerChar = lower[i];
    const prevLowerChar = lower[i - 1];

    // Test if `char` is an upper-case character and that the character
    // actually has different upper and lower case versions.
    if (char === upperChar && upperChar !== lowerChar) {
      // Multiple consecutive upper case characters shouldn't add underscores.
      // For example "fooBAR" should be converted to "foo_bar".
      if (prevChar === prevUpperChar && prevUpperChar !== prevLowerChar) {
        out += lowerChar;
      } else {
        out += '_' + lowerChar;
      }
    } else {
      out += char;
    }
  }

  return out;
});

// snake_case to camelCase converter that simply reverses
// the actions done by `snakeCase` function.
const camelCase = memoize(str => {
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
});

function keyMapper(mapper) {
  return obj => {
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
  };
}

const camelCaseKeys = keyMapper(camelCase);
const snakeCaseKeys = keyMapper(snakeCase);

function snakeCaseMappers() {
  return {
    parse: camelCaseKeys,
    format: snakeCaseKeys
  };
}

function knexSnakeCaseMappers() {
  return {
    wrapIdentifier(identifier, origWrap) {
      return origWrap(snakeCase(identifier));
    },

    postProcessResponse(result) {
      if (Array.isArray(result)) {
        const output = new Array(result.length);

        for (let i = 0, l = result.length; i < l; ++i) {
          output[i] = camelCaseKeys(result[i]);
        }

        return output;
      } else if (typeof result === 'object') {
        return camelCaseKeys(result);
      } else {
        return result;
      }
    }
  };
}

module.exports = {
  snakeCase,
  snakeCaseKeys,
  camelCase,
  camelCaseKeys,
  snakeCaseMappers,
  knexSnakeCaseMappers
};
