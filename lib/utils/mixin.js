'use strict';

const { flatten } = require('./objectUtils');

function mixin() {
  const args = flatten(arguments);
  const mixins = args.slice(1);

  return mixins.reduce((Class, mixinFunc) => {
    return mixinFunc(Class);
  }, args[0]);
}

function compose() {
  const mixins = flatten(arguments);

  return function(Class) {
    return mixin(Class, mixins);
  };
}

module.exports = {
  compose,
  mixin
};
