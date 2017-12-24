'use strict';

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

module.exports = {
  isPlainObject,
  asArray
};
