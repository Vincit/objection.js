'use strict';

const { isPromise } = require('./isPromise');

// Works like Bluebird.try.
function promiseTry(callback) {
  try {
    const maybePromise = callback();

    if (isPromise(maybePromise)) {
      return maybePromise;
    } else {
      return Promise.resolve(maybePromise);
    }
  } catch (err) {
    return Promise.reject(err);
  }
}

module.exports = {
  promiseTry,
};
