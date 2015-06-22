'use strict';

var util = require('util');

/**
 * Error of this class is thrown when a MoronModel validation fails.
 *
 * @param {Object.<String, String>} errorMessages
 * @constructor
 */
function MoronValidationError(errorMessages) {
  Error.call(this);
  Error.captureStackTrace(this, MoronValidationError);

  /**
   * A hash of <property name, error message> pairs.
   *
   * @type {Object.<String, String>}
   */
  this.data = errorMessages;
  
  /**
   * @type {number}
   */
  this.statusCode = 400;
}

util.inherits(MoronValidationError, Error);

module.exports = MoronValidationError;


