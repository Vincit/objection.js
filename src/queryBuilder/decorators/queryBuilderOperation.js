import _ from 'lodash';
import {getDialect} from '../../utils/dbUtils';

export default function queryBuilderOperation(input, name) {
  const normalizedInput = normalizeInput(input);

  return function (target, property, descriptor) {
    const operationName = name || property;

    if (_.isFunction(input) || _.isArray(input)) {
      descriptor.value = function decorator$queryBuilderOperation() {
        const args = new Array(arguments.length);

        // Don't turn this into a function. This needs to be inline for V8 to optimize this.
        for (let i = 0, l = arguments.length; i < l; ++i) {
          args[i] = arguments[i];
        }

        const methodDesc = normalizedInput.default;
        const method = new methodDesc.operationClass(operationName, methodDesc.opt);

        return this.callQueryBuilderOperation(method, args);
      };
    } else {
      descriptor.value = function decorator$queryBuilderOperationWithDialect() {
        const args = new Array(arguments.length);

        // Don't turn this into a function. This needs to be inline for V8 to optimize this.
        for (let i = 0, l = arguments.length; i < l; ++i) {
          args[i] = arguments[i];
        }

        const dialect = getDialect(this.knex());
        const methodDesc = normalizedInput[dialect] || normalizedInput.default;
        const method = new methodDesc.operationClass(operationName, methodDesc.opt);

        return this.callQueryBuilderOperation(method, args);
      };
    }
  };
}

function normalizeInput(input) {
  if (_.isFunction(input) || _.isArray(input)) {
    return {
      default: normalizeQueryOperationDesc(input)
    };
  } else {
    return _.mapValues(input, normalizeQueryOperationDesc);
  }
}

function normalizeQueryOperationDesc(desc) {
  if (_.isArray(desc)) {
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