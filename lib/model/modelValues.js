'use strict';

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
    case 1: return this[props[0]] + '';
    case 2: return this[props[0]] + ',' + this[props[1]];
    case 3: return this[props[0]] + ',' + this[props[1]] + ',' + this[props[2]];
    default: {
      // Needs to be `var` instead of `let` to prevent a weird optimization bailout.
      var key = '';

      for (let i = 0, l = props.length; i < l; ++i) {
        key += this[props[i]];

        if (i < props.length - 1) {
          key += ',';
        }
      }

      return key;
    }
  }
}

function values(model, args) {
  switch (args.length) {
    case 1: return [model[args[0]]];
    case 2: return [model[args[0]], model[args[1]]];
    case 3: return [model[args[0]], model[args[1]], model[args[2]]];
    default: {
      const ret = new Array(args.length);

      for (let i = 0, l = args.length; i < l; ++i) {
        ret[i] = model[args[i]];
      }

      return ret;
    }
  }
}

module.exports = {
  $values,
  $propKey
};