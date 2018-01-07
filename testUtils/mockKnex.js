const _ = require('lodash');
const knexMethods = require('knex/lib/query/methods').concat('queryBuilder');

/**
 * @param {function} knex
 *    Knex instance to mock.
 *
 * @param {function(object, function, Array)} mockExecutor
 *    The mock executor.
 *
 * @returns {function}
 *    Mocked knex.
 */
module.exports = function mockKnex(knex, mockExecutor) {
  const mock = (table) => {
    return mock.queryBuilder().table(table);
  };

  // Mock query builder methods.
  knexMethods.forEach(methodName => {
    mock[methodName] = (...args) => {
      return wrapBuilder(knex[methodName](...args));
    }
  });

  // Mock all other methods and properties.
  _.forOwn(knex, (value, key) => {
    if (knexMethods.indexOf(key) !== -1) {
      return;
    }

    if (_.isFunction(value)) {
      mock[key] = (...args) => {
        return knex[key](...args);
      };
    } else {
      Object.defineProperty(mock, key, {
        enumerable: true,

        get() {
          return knex[key];
        },

        set(value) {
          knex[key] = value;
        }
      });
    }
  });

  function wrapBuilder(builder) {
    const oldImpl = builder.then;

    builder.then = function (...args) {
      return mockExecutor.call(this, mock, oldImpl, args);
    };

    return builder;
  }

  return mock;
};