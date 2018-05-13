const { isObject } = require('../objectUtils');

function isPromise(obj) {
  return isObject(obj) && typeof obj.then === 'function';
}

module.exports = isPromise;
