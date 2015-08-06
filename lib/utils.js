'use strict';

var _ = require('lodash')
  , util = require('util');

/**
 * Makes the `Constructor` inherit `SuperConstructor`.
 *
 * Calls node.js `util.inherits` but also copies the "static" properties from
 * `SuperConstructor` to `Constructor`.
 *
 * @ignore
 * @param {Object} Constructor
 * @param {Object} SuperConstructor
 */
module.exports.inherits = function(Constructor, SuperConstructor) {
  for (var key in SuperConstructor) {
    Constructor[key] = SuperConstructor[key];
  }
  util.inherits(Constructor, SuperConstructor);
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
