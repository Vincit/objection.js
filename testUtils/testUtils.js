const _ = require('lodash');
const expect = require('expect.js');

/**
 * Expect that `result` contains all attributes of `partial` and their values equal.
 *
 * Example:
 *
 * ```js
 * // doesn't throw.
 * expectPartialEqual({a: 1, b: 2}, {a: 1});
 * // doesn't throw.
 * expectPartialEqual([{a: 1, b: 2}, {a: 2, b: 4}], [{a: 1}, {b: 4}]);
 * // Throws
 * expectPartialEqual({a: 1}, {b: 1});
 * // Throws
 * expectPartialEqual({a: 1}, {a: 2});
 * ```
 */
function expectPartialEqual(result, partial) {
  if (Array.isArray(result) && Array.isArray(partial)) {
    expect(result).to.have.length(partial.length);
    result.forEach((value, idx) => {
      expectPartialEqual(result[idx], partial[idx]);
    });
  } else if (_.isObject(result) && !Array.isArray(partial) && _.isObject(partial) && !Array.isArray(result)) {
    var partialKeys = _.keys(partial);
    expect(_.pick(result, partialKeys)).to.eql(partial);
  } else {
    throw new Error('result and partial must both be arrays or objects');
  }
}

module.exports = {
  expectPartialEqual: expectPartialEqual
};