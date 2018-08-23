const { isObject } = require('./objectUtils');

function buildArg(arg, builder) {
  if (!isObject(arg)) {
    return arg;
  }

  if (typeof arg.toKnexRaw === 'function') {
    return arg.toKnexRaw(builder);
  } else if (arg.isObjectionQueryBuilderBase === true) {
    return arg.subqueryOf(builder).build();
  } else {
    return arg;
  }
}

module.exports = {
  buildArg
};
