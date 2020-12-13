'use strict';

const { isObject } = require('./objectUtils');

// Super fast memoize for single argument functions.
function memoize(func) {
  const cache = new Map();

  return (input) => {
    let output = cache.get(input);

    if (output === undefined) {
      output = func(input);
      cache.set(input, output);
    }

    return output;
  };
}

// camelCase to snake_case converter that also works with non-ascii characters
// This is needed especially so that aliases containing the `:` character,
// objection uses internally, work.
function snakeCase(
  str,
  {
    upperCase = false,
    underscoreBeforeDigits = false,
    underscoreBetweenUppercaseLetters = false,
  } = {}
) {
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

    // If underScoreBeforeDigits is true then, well, insert an underscore
    // before digits :). Only the first digit gets an underscore if
    // there are multiple.
    if (underscoreBeforeDigits && isDigit(char) && !isDigit(prevChar)) {
      out += '_' + char;
      continue;
    }

    // Test if `char` is an upper-case character and that the character
    // actually has different upper and lower case versions.
    if (char === upperChar && upperChar !== lowerChar) {
      const prevCharacterIsUppercase =
        prevChar === prevUpperChar && prevUpperChar !== prevLowerChar;

      // If underscoreBetweenUppercaseLetters is true, we always place an underscore
      // before consecutive uppercase letters (e.g. "fooBAR" becomes "foo_b_a_r").
      // Otherwise, we don't (e.g. "fooBAR" becomes "foo_bar").
      if (underscoreBetweenUppercaseLetters || !prevCharacterIsUppercase) {
        out += '_' + lowerChar;
      } else {
        out += lowerChar;
      }
    } else {
      out += char;
    }
  }

  if (upperCase) {
    return out.toUpperCase();
  } else {
    return out;
  }
}

// snake_case to camelCase converter that simply reverses
// the actions done by `snakeCase` function.
function camelCase(str, { upperCase = false } = {}) {
  if (str.length === 0) {
    return str;
  }

  if (upperCase && isAllUpperCaseSnakeCase(str)) {
    // Only convert to lower case if the string is all upper
    // case snake_case. This allowes camelCase strings to go
    // through without changing.
    str = str.toLowerCase();
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

function isAllUpperCaseSnakeCase(str) {
  for (let i = 1, l = str.length; i < l; ++i) {
    const char = str[i];

    if (char !== '_' && char !== char.toUpperCase()) {
      return false;
    }
  }

  return true;
}

function isDigit(char) {
  return char >= '0' && char <= '9';
}

// Returns a function that splits the inputs string into pieces using `separator`,
// only calls `mapper` for the last part and concatenates the string back together.
// If no separators are found, `mapper` is called for the entire string.
function mapLastPart(mapper, separator) {
  return (str) => {
    const idx = str.lastIndexOf(separator);
    const mapped = mapper(str.slice(idx + separator.length));
    return str.slice(0, idx + separator.length) + mapped;
  };
}

// Returns a function that takes an object as an input and maps the object's keys
// using `mapper`. If the input is not an object, the input is returned unchanged.
function keyMapper(mapper) {
  return (obj) => {
    if (!isObject(obj) || Array.isArray(obj)) {
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

function snakeCaseMappers(opt = {}) {
  return {
    parse: keyMapper(memoize((str) => camelCase(str, opt))),
    format: keyMapper(memoize((str) => snakeCase(str, opt))),
  };
}

function knexIdentifierMappers({ parse, format, idSeparator = ':' } = {}) {
  const formatId = memoize(mapLastPart(format, idSeparator));
  const parseId = memoize(mapLastPart(parse, idSeparator));
  const parseKeys = keyMapper(parseId);

  return {
    wrapIdentifier(identifier, origWrap) {
      return origWrap(formatId(identifier));
    },

    postProcessResponse(result) {
      if (Array.isArray(result)) {
        const output = new Array(result.length);

        for (let i = 0, l = result.length; i < l; ++i) {
          output[i] = parseKeys(result[i]);
        }

        return output;
      } else {
        return parseKeys(result);
      }
    },
  };
}

function knexSnakeCaseMappers(opt = {}) {
  return knexIdentifierMappers({
    parse: (str) => camelCase(str, opt),
    format: (str) => snakeCase(str, opt),
  });
}

function knexIdentifierMapping(colToProp) {
  const propToCol = Object.keys(colToProp).reduce((propToCol, column) => {
    propToCol[colToProp[column]] = column;
    return propToCol;
  }, {});

  return knexIdentifierMappers({
    parse: (column) => colToProp[column] || column,
    format: (prop) => propToCol[prop] || prop,
  });
}

module.exports = {
  snakeCase,
  camelCase,
  snakeCaseMappers,
  knexSnakeCaseMappers,
  knexIdentifierMappers,
  knexIdentifierMapping,

  camelCaseKeys: keyMapper(memoize(camelCase)),
  snakeCaseKeys: keyMapper(memoize(snakeCase)),
};
