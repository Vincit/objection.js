const isPromise = require('./isPromise');

// Call `func` after `obj` has been resolved. Call `func` synchronously if
// `obj` is not a promise for performance reasons.
function after(obj, func) {
  if (isPromise(obj)) {
    return obj.then(func);
  } else {
    return func(obj);
  }
}

module.exports = after;
