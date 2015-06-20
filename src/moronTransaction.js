'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var MoronModel = require('./MoronModel');
var utils = require('./moronUtils');

/**
 * Starts a transaction.
 *
 * @function transaction
 * @returns {Promise}
 */
module.exports = function transaction() {
  // There must be at least one model class and the callback.
  if (arguments.length < 2) {
    return Promise.reject(new Error('moron.transaction: provide at least one MoronModel class to bind to the transaction'));
  }

  // The last argument should be the callback and all other MoronModel subclasses.
  var callback = _.last(arguments);
  var modelClasses = _.take(arguments, arguments.length - 1);
  var i;

  for (i = 0; i < modelClasses.length; ++i) {
    if (!utils.isSubclassOf(modelClasses[i], MoronModel)) {
      return Promise.reject(new Error('moron.transaction: all but the last argument should be MoronModel subclasses'));
    }
  }

  var knex = _.first(modelClasses).knex();
  for (i = 0; i < modelClasses.length; ++i) {
    if (modelClasses[i].knex() !== knex) {
      return Promise.reject(new Error('moron.transaction: all MoronModel subclasses must be bound to the same database'));
    }
  }

  return knex.transaction(function (trx) {
    for (var i = 0; i < modelClasses.length; ++i) {
      modelClasses[i] = modelClasses[i].bindKnex(trx);
    }

    return Promise.try(function () {
      return callback.apply(trx, modelClasses);
    });
  });
};
