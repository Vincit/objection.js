'use strict';

class NotFoundError extends Error {
  constructor(data = {}) {
    super(data.message || 'NotFoundError');

    this.type = 'NotFound';
    this.name = this.constructor.name;
    this.data = data;
    this.statusCode = 404;
  }
}

module.exports = {
  NotFoundError
};
