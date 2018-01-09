const { asArray } = require('../utils/objectUtils');

const Type = {
  PropertyValidation: 'PropertyValidation',
  GenericInputValidation: 'GenericInputValidation'
};

class ValidationError extends Error {
  static get Type() {
    return Type;
  }

  constructor({ type, message, data }) {
    super(message || errorsToMessage(data));

    this.type = type;
    this.data = data;
    this.statusCode = 400;
  }
}

function errorsToMessage(data) {
  return Object.keys(data)
    .reduce((messages, key) => {
      messages.push(`${key}: ${asArray(data[key]).join(', ')}`);
      return messages;
    }, [])
    .join(', ');
}

module.exports = ValidationError;
