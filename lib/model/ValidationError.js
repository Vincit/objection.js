'use strict';

const { asArray, isString } = require('../utils/objectUtils');

const ValidationErrorType = {
  ModelValidation: 'ModelValidation',
  RelationExpression: 'RelationExpression',
  UnallowedRelation: 'UnallowedRelation',
  InvalidGraph: 'InvalidGraph'
};

class ValidationError extends Error {
  static get Type() {
    return ValidationErrorType;
  }

  constructor({ type, message, data = {}, statusCode = 400 }) {
    super(message || errorsToMessage(data));

    this.name = this.constructor.name;
    this.type = type;
    this.data = data;
    this.statusCode = statusCode;
  }
}

function errorsToMessage(data) {
  return Object.keys(data)
    .reduce((messages, key) => {
      messages.push(
        `${key}: ${asArray(data[key])
          .map(message)
          .join(', ')}`
      );
      return messages;
    }, [])
    .join(', ');
}

function message(it) {
  if (isString(it)) {
    return it;
  } else {
    return it.message;
  }
}

module.exports = {
  ValidationError,
  ValidationErrorType
};
