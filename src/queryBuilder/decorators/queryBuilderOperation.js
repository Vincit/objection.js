import _ from 'lodash';
import {getDialect} from '../../utils/dbUtils';

export default function queryBuilderOperation(input, name) {
  const normalizedInput = normalizeInput(input);

  return function (target, property, descriptor) {
    const methodName = name || property;

    if (_.isFunction(input) || _.isArray(input)) {
      descriptor.value = function decorator$queryBuilderOperation() {
        const args = new Array(arguments.length);

        // Don't turn this into a function. This needs to be inline for V8 to optimize this.
        for (let i = 0; i < args.length; ++i) {
          args[i] = arguments[i];
        }

        const methodDesc = normalizedInput.default;
        const method = new methodDesc.methodClass(this, methodName, methodDesc.opt);

        return this.callQueryBuilderOperation(method, args);
      };
    } else {
      descriptor.value = function decorator$queryBuilderOperationWithDialect() {
        const args = new Array(arguments.length);

        // Don't turn this into a function. This needs to be inline for V8 to optimize this.
        for (let i = 0; i < args.length; ++i) {
          args[i] = arguments[i];
        }

        const dialect = getDialect(this.knex());
        const methodDesc = normalizedInput[dialect] || normalizedInput.default;
        const method = new methodDesc.methodClass(this, methodName, methodDesc.opt);

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

function normalizeQueryOperationDesc(methodDesc) {
  if (_.isArray(methodDesc)) {
    return {
      methodClass: methodDesc[0],
      opt: methodDesc[1]
    };
  } else {
    return {
      methodClass: methodDesc,
      opt: {}
    };
  }
}