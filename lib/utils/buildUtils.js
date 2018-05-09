const { isObject } = require('./objectUtils');

function buildArg(arg, knex) {
  if (!isObject(arg)) {
    return arg;
  }

  if (typeof arg.toKnexRaw === 'function') {
    return arg.toKnexRaw(knex);
  } else if (arg.isObjectionQueryBuilderBase === true) {
    return arg.build();
  } else {
    return arg;
  }
}

module.exports = {
  buildArg
};
