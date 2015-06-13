var util = require('util');

/**
 * @param data
 * @constructor
 */
function MoronValidationError(data) {
  Error.call(this);
  Error.captureStackTrace(this, arguments.callee);

  this.data = data;
  this.statusCode = 400;
}

util.inherits(MoronValidationError, Error);

module.exports = MoronValidationError;


