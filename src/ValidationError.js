'use strict';

var util = require('util');

/**
 * Error of this class is thrown when a Model validation fails.
 *
 * @param {Object.<String, String>} errorMessages
 * @constructor
 */
function ValidationError(errorMessages) {
  Error.call(this);
  Error.captureStackTrace(this, ValidationError);

  /**
   * A hash of `{'property name': 'error message'}` pairs.
   *
   * @type {Object.<String, String>}
   */
  this.data = errorMessages;

  /**
   * @type {number}
   */
  this.statusCode = 400;
}

util.inherits(ValidationError, Error);

module.exports = ValidationError;


