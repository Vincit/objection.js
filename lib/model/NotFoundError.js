'use strict';

class NotFoundError extends Error {
  constructor({ modelClass, data = {}, statusCode = 404, ...rest } = {}) {
    super(rest.message || 'NotFoundError');

    this.type = 'NotFound';
    this.name = this.constructor.name;
    this.data = { ...rest, ...data };
    this.statusCode = statusCode;

    // Add as non-enumerable in case people are passing instances of
    // this error directly to `JSON.stringify`.
    Object.defineProperty(this, 'modelClass', {
      value: modelClass,
      enumerable: false,
    });
  }
}

module.exports = {
  NotFoundError,
};
