import _ from 'lodash';

/**
 * Makes the `Constructor` inherit `SuperConstructor`.
 *
 * Calls node.js `util.inherits` but also copies the "static" properties from
 * `SuperConstructor` to `Constructor`.
 *
 * This function is taken from Babel transpiler.
 *
 * @param {Object} subClass
 * @param {Object} superClass
 */
export function inherits(subClass, superClass) {
  if (typeof superClass !== "function" && superClass !== null) {
    throw new TypeError("Super expression must either be null or a function, not " + typeof superClass);
  }

  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      enumerable: false,
      writable: true,
      configurable: true
    }
  });

  if (superClass) {
    subClass.__proto__ = superClass;
  }

  return subClass;
}

/**
 * Tests if a constructor function inherits another constructor function.
 *
 * @param {Object} Constructor
 * @param {Object} SuperConstructor
 * @returns {boolean}
 */
export function isSubclassOf(Constructor, SuperConstructor) {
  if (!_.isFunction(SuperConstructor)) {
    return false;
  }

  while (_.isFunction(Constructor)) {
    if (Constructor === SuperConstructor) return true;
    let proto = Constructor.prototype.__proto__;
    Constructor = proto && proto.constructor;
  }

  return false;
}
