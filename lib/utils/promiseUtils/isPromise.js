'use strict';

const { isObject, isFunction } = require('../objectUtils');

function isPromise(obj) {
  return isObject(obj) && isFunction(obj.then);
}

module.exports = {
  isPromise,
};
