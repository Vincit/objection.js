'use strict';

// Property keys needs to be prefixed with a non-numeric character so that
// they are not considered indexes when used as object keys.
const PROP_KEY_PREFIX = 'k_';

function $values() {
  if (arguments.length === 0) {
    return values(this, Object.keys(this));
  } else {
    if (arguments.length === 1 && Array.isArray(arguments[0])) {
      return values(this, arguments[0]);
    } else {
      const args = new Array(arguments.length);

      for (let i = 0, l = args.length; i < l; ++i) {
        args[i] = arguments[i];
      }

      return values(this, args);
    }
  }
}

function $propKey(props) {
  switch (props.length) {
    case 1: return propKey1(this, props);
    case 2: return propKey2(this, props);
    case 3: return propKey3(this, props);
    default: return propKeyN(this, props);
  }
}

function values(model, args) {
  switch (args.length) {
    case 1: return values1(model, args);
    case 2: return values2(model, args);
    case 3: return values3(model, args);
    default: return valuesN(model, args);
  }
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
  return PROP_KEY_PREFIX + model[props[0]];
}

function propKey2(model, props) {
  return PROP_KEY_PREFIX + model[props[0]] + ',' + model[props[1]];
}

function propKey3(model, props) {
  return PROP_KEY_PREFIX + model[props[0]] + ',' + model[props[1]] + ',' + model[props[2]];
}

function propKeyN(model, props) {
  // Needs to be `var` instead of `let` to prevent a weird optimization bailout.
  var key = PROP_KEY_PREFIX;

  for (let i = 0, l = props.length; i < l; ++i) {
    key += model[props[i]];

    if (i < l - 1) {
      key += ',';
    }
  }

  return key;
}

module.exports = {
  $values,
  $propKey
};