'use strict';

const staticHiddenProps = [
  '$$knex',
  '$$validator',
  '$$jsonSchema',
  '$$colToProp',
  '$$propToCol',
  '$$idColumnArray',
  '$$idPropertyArray',
  '$$idProperty',
  '$$relations',
  '$$relationArray'
];

function defineNonEnumerableProperty(obj, prop, value) {
  Object.defineProperty(obj, prop, {
    enumerable: false,
    writable: true,
    configurable: true,
    value
  });
}

module.exports = {
  staticHiddenProps,
  defineNonEnumerableProperty
};