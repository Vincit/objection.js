'use strict';

class ValidationError extends Error {
  constructor(errors) {
    super(JSON.stringify(errors, null, 2));

    this.data = errors;
    this.statusCode = 400;
  }
}

module.exports = ValidationError;
