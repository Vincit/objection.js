class IllegalArgumentError extends Error {
  constructor(message, data) {
    super(message);

    this.name = this.constructor.name;
    this.data = data;
    this.statusCode = 400;
  }
}

module.exports = IllegalArgumentError;
