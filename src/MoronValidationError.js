'use strict';

var util = require('util');

/**
 * @param data
 * @constructor
 */
function MoronValidationError(data) {
  Error.call(this);
  Error.captureStackTrace(this, MoronValidationError);

  this.data = data;
  this.statusCode = 400;
}

util.inherits(MoronValidationError, Error);

module.exports = MoronValidationError;


