'use strict';

/**
 * This module is used to make anonymous model subclasses.
 *
 * Doing this in a way that works for both ES5 and ES6 node versions is a bit of a hack. We
 * first attempt to require the ES6 version that uses the `class` and `extends` keywords and
 * then fall back to the ES5 version that mimics ES6 inheritance as well as possible. We cannot
 * use ES5 inheritance to inherit models created using the `class` keyword because:
 *
 * ```js
 * function AnonymousModelSubClass() {
 *   // This line will throw if `BaseClass` is created using the `class` keyword.
 *   // In ES6 you cannot invoke the constructor function without `new` keyword.
 *   BaseClass.apply(this, arguments);
 * }
 * ```
 */
try {
  module.exports = require('./inheritModelEs6');
} catch (err) {
  module.exports = require('./inheritModelEs5');
}
