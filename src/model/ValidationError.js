import util from 'util';

// Note: babel cannot inherit from built-in types like Error.
// that's why we use ES5 inheritance here.

/**
 * @param {Object} errors
 */
export default function ValidationError(errors) {
  Error.call(this);
  Error.captureStackTrace(this, ValidationError);

  /**
   * @type {Object}
   */
  this.data = errors;

  /**
   * @type {number}
   */
  this.statusCode = 400;

  /**
   * @type {string}
   */
  this.message = JSON.stringify(errors, null, 2);
}

util.inherits(ValidationError, Error);


