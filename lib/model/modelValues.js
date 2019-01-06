'use strict';

const { isObject } = require('../utils/objectUtils');

// Property keys needs to be prefixed with a non-numeric character so that
// they are not considered indexes when used as object keys.
const PROP_KEY_PREFIX = 'k_';

function values(model, args) {
  switch (args.length) {
    case 1:
      return values1(model, args);
    case 2:
      return values2(model, args);
    case 3:
      return values3(model, args);
    default:
      return valuesN(model, args);
  }
}

function propKey(model, props) {
  switch (props.length) {
    case 1:
      return propKey1(model, props);
    case 2:
      return propKey2(model, props);
    case 3:
      return propKey3(model, props);
    default:
      return propKeyN(model, props);
  }
}

function hasProps(model, props) {
  for (let i = 0; i < props.length; ++i) {
    const value = model[props[i]];

    if (isNullOrUndefined(value)) {
      return false;
    }
  }

  return true;
}

function values1(model, args) {
  return [model[args[0]]];
}

function values2(model, args) {
  return [model[args[0]], model[args[1]]];
}

function values3(model, args) {
  return [model[args[0]], model[args[1]], model[args[2]]];
}

function valuesN(model, args) {
  const ret = new Array(args.length);

  for (let i = 0, l = args.length; i < l; ++i) {
    ret[i] = model[args[i]];
  }

  return ret;
}

function propKey1(model, props) {
  return PROP_KEY_PREFIX + propToStr(model[props[0]]);
}

function propKey2(model, props) {
  return PROP_KEY_PREFIX + propToStr(model[props[0]]) + ',' + propToStr(model[props[1]]);
}

function propKey3(model, props) {
  return (
    PROP_KEY_PREFIX +
    propToStr(model[props[0]]) +
    ',' +
    propToStr(model[props[1]]) +
    ',' +
    propToStr(model[props[2]])
  );
}

function propKeyN(model, props) {
  let key = PROP_KEY_PREFIX;

  for (let i = 0, l = props.length; i < l; ++i) {
    key += propToStr(model[props[i]]);

    if (i < l - 1) {
      key += ',';
    }
  }

  return key;
}

function propToStr(value) {
  if (value === null) {
    return 'null';
  } else if (value === undefined) {
    return 'undefined';
  } else if (isObject(value)) {
    return JSON.stringify(value);
  } else {
    return `${value}`;
  }
}

function isNullOrUndefined(val) {
  return val === null || val === undefined;
}

module.exports = {
  PROP_KEY_PREFIX,
  propToStr,
  values,
  hasProps,
  propKey
};
