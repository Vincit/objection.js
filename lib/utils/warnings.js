'use strict';

const LOGGED_WARNINGS = new Set();

// Log each warning only once.
function warnOnce(message) {
  if (!LOGGED_WARNINGS.has(message)) {
    LOGGED_WARNINGS.add(message);
    console.warn(`[objection] ${message}`);
  }
}

function deprecate(message) {
  warnOnce(message);
}

// Only meant for tests that need to see a warning again.
function resetWarnings() {
  LOGGED_WARNINGS.clear();
}

module.exports = {
  warnOnce,
  deprecate,
  resetWarnings,
};
