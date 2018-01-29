// Quick and dirty check if an object is a plain object and not
// for example an instance of some class.
function isPlainObject(item) {
  return (
    item !== null &&
    typeof item === 'object' &&
    (!item.constructor || item.constructor === Object) &&
    (!item.toString || item.toString === Object.prototype.toString)
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

module.exports = {
  isObject,
  isPlainObject,
  asArray,
  uniqBy
};
