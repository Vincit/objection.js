'use strict';

const LOGGED_DEPRECATIONS = new Set();

function deprecate(message) {
  // Only log deprecation messages once.
  if (!LOGGED_DEPRECATIONS.has(message)) {
    LOGGED_DEPRECATIONS.add(message);
    console.warn(message);
  }
}

module.exports = {
  deprecate,
};
