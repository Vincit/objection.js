'use strict';

const Promise = require('bluebird');

function isPromise(obj) {
  return obj && typeof obj === 'object' && typeof obj.then === 'function';
}

// Call `func` after `obj` has been resolved. Call `func` synchronously if
// `obj` is not a promise for performance reasons.
function after(obj, func) {
  if (isPromise(obj)) {
    return obj.then(func);
  } else {
    return func(obj);
  }
}

// Return `returnValue` after `obj` has been resolved. Return `returnValue`
// synchronously if `obj` is not a promise for performance reasons.
function afterReturn(obj, returnValue) {
  if (obj instanceof Promise) {
    return obj.return(returnValue);
  } else if (isPromise(obj)) {
    return obj.then(() => returnValue);
  } else {
    return returnValue;
  }
}

// Map `arr` with `mapper` and after that return `returnValue`. If none of
// the mapped values is a promise, return synchronously for performance
// reasons.
function mapAfterAllReturn(arr, mapper, returnValue) {
  const results = new Array(arr.length);
  let containsPromise = false;

  for (let i = 0, l = arr.length; i < l; ++i) {
    results[i] = mapper(arr[i]);

    if (isPromise(results[i])) {
      containsPromise = true;
    }
  }

  if (containsPromise) {
    return Promise.all(results).return(returnValue);
  } else {
    return returnValue;
  }
}

module.exports = {
  isPromise,
  after,
  afterReturn,
  mapAfterAllReturn
};
