const isPromise = require('./isPromise');

// Return `returnValue` after `obj` has been resolved. Return `returnValue`
// synchronously if `obj` is not a promise for performance reasons.
function afterReturn(obj, returnValue) {
  if (isPromise(obj)) {
    return obj.then(() => returnValue);
  } else {
    return returnValue;
  }
}

module.exports = afterReturn;
