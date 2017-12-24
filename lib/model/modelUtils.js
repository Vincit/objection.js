'use strict';

const hiddenProps = ['$$queryProps'];

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
  '$$relationArray',
  '$$jsonAttributes',
  '$$columnNameMappers'
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
  hiddenProps,
  staticHiddenProps,
  defineNonEnumerableProperty
};
