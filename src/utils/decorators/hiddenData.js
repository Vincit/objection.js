import {createGetter, createSetter} from '../hiddenData';

export default function hiddenData(opt) {
  return function (target, property, descriptor) {
    let propName;
    let append;

    if (typeof opt === 'object') {
      propName = opt.name || property;
      append = !!opt.append;
    } else {
      propName = opt || property;
      append = false;
    }

    const get = createGetter(propName);
    const set = createSetter(propName);

    if (typeof descriptor.value === 'function') {
      if (append) {
        descriptor.value = function decorator$hiddenData() {
          if (arguments.length === 0) {
            return get(this);
          } else {
            return appendSet(this, arguments[0], get, set);
          }
        };
      } else {
        descriptor.value = function decorator$hiddenData() {
          if (arguments.length === 0) {
            return get(this);
          } else {
            set(this, arguments[0]);
          }
        };
      }
    }

    if (typeof descriptor.get === 'function') {
      descriptor.get = function decorator$hiddenDataGetter() {
        return get(this);
      };
    }

    if (typeof descriptor.set === 'function') {
      descriptor.set = function decorator$hiddenDataSetter(value) {
        return set(this, value);
      }
    }
  };
}

function appendSet(self, value, get, set) {
  const data = get(self);

  if (Array.isArray(data) && Array.isArray(value)) {
    for (let i = 0, l = value.length; i < l; ++i) {
      data.push(value[i]);
    }
  } else {
    set(self, value);
  }
}