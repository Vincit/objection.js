'use strict';

const util = require('util');

// Note: babel cannot inherit from built-in types like Error.
// that's why we use ES5 inheritance here.

function ValidationError(errors) {
  Error.call(this);
  Error.captureStackTrace(this, ValidationError);

  this.data = errors;
  this.statusCode = 400;
  this.message = JSON.stringify(errors, null, 2);
}

util.inherits(ValidationError, Error);

module.exports = ValidationError;


