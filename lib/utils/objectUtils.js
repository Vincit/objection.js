const { clone, cloneDeep } = require('./clone');

function isObject(value) {
  return value !== null && typeof value === 'object';
}

// Quick and dirty check if an object is a plain object and not
// for example an instance of some class.
function isPlainObject(value) {
  return (
    isObject(value) &&
    (!value.constructor || value.constructor === Object) &&
    (!value.toString || value.toString === Object.prototype.toString)
  );
}

function isFunction(value) {
  return typeof value === 'function';
}

function isString(value) {
  return typeof value === 'string';
}

function isNumber(value) {
  return typeof value === 'number';
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function uniqBy(items, keyGetter = null) {
  const map = new Map();

  for (let i = 0, l = items.length; i < l; ++i) {
    const item = items[i];
    const key = keyGetter !== null ? keyGetter(item) : item;

    map.set(key, item);
  }

  return Array.from(map.values());
}

function omit(obj, keysToOmit) {
  keysToOmit = asArray(keysToOmit);

  const keys = Object.keys(obj);
  const out = {};

  for (let i = 0, l = keys.length; i < l; ++i) {
    const key = keys[i];

    if (!keysToOmit.includes(key)) {
      out[key] = obj[key];
    }
  }

  return out;
}

function difference(arr1, arr2) {
  const arr2Set = new Set(arr2);
  const diff = [];

  for (let i = 0; i < arr1.length; ++i) {
    const value = arr1[i];

    if (!arr2Set.has(value)) {
      diff.push(value);
    }
  }

  return diff;
}

function union(arr1, arr2) {
  const all = new Set();

  for (let i = 0; i < arr1.length; ++i) {
    all.add(arr1[i]);
  }

  for (let i = 0; i < arr2.length; ++i) {
    all.add(arr2[i]);
  }

  return Array.from(all);
}

function last(arr) {
  return arr[arr.length - 1];
}

function upperFirst(str) {
  return str[0].toUpperCase() + str.substring(1);
}

function values(obj) {
  if (isObject(obj)) {
    const keys = Object.keys(obj);
    const values = new Array(keys.length);

    for (let i = 0, l = keys.length; i < l; ++i) {
      values[i] = obj[keys[i]];
    }

    return values;
  } else {
    return [];
  }
}

function once(func) {
  let called = false;
  let value = undefined;

  return function() {
    if (called === false) {
      called = true;
      value = func.apply(this, arguments);
    }

    return value;
  };
}

function flatten(arrays) {
  const out = [];
  let outIdx = 0;

  for (let i = 0, l = arrays.length; i < l; ++i) {
    const value = arrays[i];

    if (Array.isArray(value)) {
      for (let j = 0; j < value.length; ++j) {
        out.push(value[j]);
      }
    } else {
      out.push(value);
    }
  }

  return out;
}

function get(obj, path) {
  for (let i = 0, l = path.length; i < l; ++i) {
    const key = path[i];

    if (!isObject(obj)) {
      return undefined;
    }

    obj = obj[key];
  }

  return obj;
}

function set(obj, path, value) {
  const inputObj = obj;

  for (let i = 0, l = path.length - 1; i < l; ++i) {
    const key = path[i];
    let child = obj[key];

    if (!isObject(child)) {
      const nextKey = path[i + 1];

      if (isNaN(nextKey)) {
        child = {};
      } else {
        child = [];
      }

      obj[key] = child;
    }

    obj = child;
  }

  if (path.length > 0 && isObject(obj)) {
    obj[path[path.length - 1]] = value;
  }

  return inputObj;
}

function zipObject(keys, values) {
  const out = {};

  for (let i = 0, l = keys.length; i < l; ++i) {
    out[keys[i]] = values[i];
  }

  return out;
}

function chunk(arr, chunkSize) {
  const out = [];

  for (let i = 0, l = arr.length; i < l; ++i) {
    const item = arr[i];

    if (out.length === 0 || out[out.length - 1].length === chunkSize) {
      out.push([]);
    }

    out[out.length - 1].push(item);
  }

  return out;
}

function mergeMaps(map1, map2) {
  const map = new Map();

  if (map1) {
    for (let key of map1.keys()) {
      map.set(key, map1.get(key));
    }
  }

  if (map2) {
    for (let key of map2.keys()) {
      map.set(key, map2.get(key));
    }
  }

  return map;
}

module.exports = {
  isString,
  isObject,
  isNumber,
  isFunction,
  isPlainObject,
  difference,
  upperFirst,
  zipObject,
  mergeMaps,
  cloneDeep,
  asArray,
  flatten,
  uniqBy,
  values,
  union,
  chunk,
  clone,
  omit,
  once,
  last,
  get,
  set
};
