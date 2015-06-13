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
module.exports = function moronTransaction() {
  // There must be at least one model class and the callback.
  if (arguments.length < 2) {
    return Promise.reject(new Error('transaction: provide at least one MoronModel class to bind to the transaction'));
  }

  // The last argument should be the callback and all other MoronModel subclasses.
  var callback = _.last(arguments);
  var modelClasses = _.take(arguments, arguments.length - 1);
  var knex = _.first(modelClasses).knex();

  for (var i = 0; i < modelClasses.length; ++i) {
    var modelClass = modelClasses[i];

    if (!utils.isSubclassOf(modelClass, MoronModel)) {
      return Promise.reject(new Error('transaction: all but the last argument should be MoronModel subclasses'));
    }

    if (modelClass.knex() !== knex) {
      return Promise.reject(new Error('transaction: all MoronModel subclasses must be bound to the same database'));
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
