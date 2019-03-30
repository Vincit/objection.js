'use strict';

const { isObject, isFunction } = require('./objectUtils');

function buildArg(arg, builder) {
  if (!isObject(arg)) {
    return arg;
  }

  if (isFunction(arg.toKnexRaw)) {
    return arg.toKnexRaw(builder);
  } else if (arg.isObjectionQueryBuilderBase === true) {
    return arg.subqueryOf(builder).toKnexQuery();
  } else {
    return arg;
  }
}

module.exports = {
  buildArg
};
