'use strict';

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

function knexSnakeCaseMappers() {
  const toSnakeCase = memoize(snakeCase);
  const toCamelCase = memoize(camelCase);

  function camelizeKeys(obj) {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const keys = Object.keys(obj);
    const out = {};

    for (let i = 0, l = keys.length; i < l; ++i) {
      const key = keys[i];
      out[toCamelCase(key)] = obj[key];
    }

    return out;
  }

  return {
    wrapIdentifier(identifier, origWrap) {
      return origWrap(toSnakeCase(identifier));
    },

    postProcessResponse(result) {
      if (Array.isArray(result)) {
        if (result.length === 0) {
          return result;
        } else {
          const output = new Array(result.length);

          for (let i = 0, l = result.length; i < l; ++i) {
            output[i] = camelizeKeys(result[i]);
          }

          return output;
        }
      } else if (typeof result === 'object') {
        return camelizeKeys(result);
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
