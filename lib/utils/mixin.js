'use strict';

const flatten = require('lodash/flatten');
const tail = require('lodash/tail');

function mixin() {
  const args = flatten(arguments);
  const mixins = tail(args);

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
