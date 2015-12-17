'use strict';

var _ = require('lodash')
  , util = require('util');

/**
 * Makes the `Constructor` inherit `SuperConstructor`.
 *
 * Calls node.js `util.inherits` but also copies the "static" properties from
 * `SuperConstructor` to `Constructor`.
 *
 * This function is taken from Babel transpiler.
 *
 * @ignore
 * @param {Object} subClass
 * @param {Object} superClass
 */
module.exports.inherits = function(subClass, superClass) {
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
};

/**
 * Tests if a constructor function inherits another constructor function.
 *
 * @ignore
 * @param {Object} Constructor
 * @param {Object} SuperConstructor
 * @returns {boolean}
 */
module.exports.isSubclassOf = function(Constructor, SuperConstructor) {
  if (!_.isFunction(SuperConstructor)) {
    return false;
  }

  while (_.isFunction(Constructor)) {
    if (Constructor === SuperConstructor) return true;
    var proto = Constructor.prototype.__proto__;
    Constructor = proto && proto.constructor;
  }

  return false;
};

/**
 * @ignore
 * @param knex
 * @returns {boolean}
 */
module.exports.isSqlite = function (knex) {
  /* istanbul ignore if */
  if (!knex.client || !_.isString(knex.client.dialect)) {
    throw new Error('knex API has changed');
  }
  return knex.client.dialect === 'sqlite3';
};

/**
 * @ignore
 * @param knex
 * @returns {boolean}
 */
module.exports.isMySql = function (knex) {
  /* istanbul ignore if */
  if (!knex.client || !_.isString(knex.client.dialect)) {
    throw new Error('knex API has changed');
  }
  return knex.client.dialect === 'mysql';
};

/**
 * @ignore
 * @param knex
 * @returns {boolean}
 */
module.exports.isPostgres = function (knex) {
  /* istanbul ignore if */
  if (!knex.client || !_.isString(knex.client.dialect)) {
    throw new Error('knex API has changed');
  }
  return knex.client.dialect === 'postgresql';
};
