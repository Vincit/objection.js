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

  return Object.keys(obj).reduce((out, key) => {
    if (!keysToOmit.includes(key)) {
      out[key] = obj[key];
    }

    return out;
  }, {});
}

module.exports = {
  isObject,
  isPlainObject,
  asArray,
  uniqBy,
  omit
};
