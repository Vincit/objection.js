'use strict';

const mapValues = require('lodash/mapValues');
const getDialect = require('../../utils/knexUtils').getDialect;

function queryBuilderOperation(input, name) {
  const normalizedInput = normalizeInput(input);

  return function (target, property, descriptor) {
    const operationName = name || property;

    if (typeof input === 'function' || Array.isArray(input)) {
      descriptor.value = function decorator$queryBuilderOperation() {
        const args = new Array(arguments.length);
        const methodDesc = normalizedInput.default;
        const method = new methodDesc.operationClass(operationName, methodDesc.opt);

        // Don't turn this into a function. This needs to be inline for V8 to optimize it.
        for (let i = 0, l = arguments.length; i < l; ++i) {
          args[i] = arguments[i];
        }

        return this.callQueryBuilderOperation(method, args);
      };
    } else {
      descriptor.value = function decorator$queryBuilderOperationWithDialect() {
        const args = new Array(arguments.length);
        const dialect = getDialect(this.knex());
        const methodDesc = normalizedInput[dialect] || normalizedInput.default;
        const method = new methodDesc.operationClass(operationName, methodDesc.opt);

        // Don't turn this into a function. This needs to be inline for V8 to optimize it.
        for (let i = 0, l = arguments.length; i < l; ++i) {
          args[i] = arguments[i];
        }

        return this.callQueryBuilderOperation(method, args);
      };
    }
  };
}

function normalizeInput(input) {
  if (typeof input === 'function' || Array.isArray(input)) {
    return {
      default: normalizeQueryOperationDesc(input)
    };
  } else {
    return mapValues(input, normalizeQueryOperationDesc);
  }
}

function normalizeQueryOperationDesc(desc) {
  if (Array.isArray(desc)) {
    return {
      operationClass: desc[0],
      opt: desc[1]
    };
  } else {
    return {
      operationClass: desc,
      opt: {}
    };
  }
}

module.exports = queryBuilderOperation;