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
  var mock = function (table) {
    return mock.queryBuilder().table(table);
  };

  // Mock query builder methods.
  _.each(knexMethods, function (methodName) {
    mock[methodName] = function () {
      return wrapBuilder(knex[methodName].apply(knex, arguments));
    }
  });

  // Mock all other methods and properties.
  _.forOwn(knex, function (value, key) {
    if (knexMethods.indexOf(key) !== -1) {
      return;
    }

    if (_.isFunction(value)) {
      mock[key] = function () {
        return knex[key].apply(knex, arguments);
      };
    } else {
      Object.defineProperty(mock, key, {
        enumerable: true,

        get: function () {
          return knex[key];
        },
        set: function (value) {
          knex[key] = value;
        }
      });
    }
  });

  function wrapBuilder(builder) {
    var oldImpl = builder.then;

    builder.then = function () {
      return mockExecutor.call(this, mock, oldImpl, _.toArray(arguments));
    };

    return builder;
  }

  return mock;
};