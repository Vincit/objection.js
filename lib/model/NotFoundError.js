'use strict';

class NotFoundError extends Error {
  constructor(data) {
    super('NotFoundError');

    this.data = data;
    this.statusCode = 404;
  }
}

module.exports = NotFoundError;
