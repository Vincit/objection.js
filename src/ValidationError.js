import util from 'util';

// Note: babel cannot inherit from built-in types like Error.
// that's why we use ES5 inheritance here.

/**
 * Error of this class is thrown when a Model validation fails.
 *
 * @param {Object} errors
 * @constructor
 */
export default function ValidationError(errors) {
  Error.call(this);
  Error.captureStackTrace(this, ValidationError);

  /**
   * Any data that describes the errors.
   *
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


