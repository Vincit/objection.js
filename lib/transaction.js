'use strict';

var _ = require('lodash');
var Promise = require('bluebird');
var Model = require('./Model');
var utils = require('./utils');

/**
 * Starts a transaction.
 *
 * Give the the model classes you want to use in the transaction as arguments to this
 * function. The model classes are bound to a newly created transaction and passed to
 * the callback. All queries created using the bound model classes or any result acquired
 * through them take part in the same transaction.
 *
 * You must return a promise from the callback. If this promise is fulfilled the transaction
 * is committed. If the promise is rejected the transaction is rolled back.
 *
 * Examples:
 *
 * ```js
 * objection.transaction(Person, Animal, function (Person, Animal) {
 *
 *  return Person
 *    .query()
 *    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
 *    .then(function () {
 *      return Animal.query().insert({name: 'Scrappy'});
 *    });
 *
 * }).then(function (scrappy) {
 *   console.log('Jennifer and Scrappy were successfully inserted');
 * }).catch(function (err) {
 *   console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
 * });
 * ```
 *
 * Related model classes are automatically bound to the same transaction. So if you use
 * `Animal` implicitly through `Person`'s relations you don't have to bind Animal explicitly.
 * The following example clarifies this:
 *
 * ```js
 * objection.transaction(Person, function (Person) {
 *
 *  return Person
 *    .query()
 *    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
 *    .then(function (jennifer) {
 *      // This insert takes part in the transaction even though we didn't explicitly
 *      // bind the `Animal` model class.
 *      return jennifer.$relatedQuery('pets').insert({name: 'Scrappy'});
 *    });
 *
 * }).then(function (scrappy) {
 *   console.log('Jennifer and Scrappy were successfully inserted');
 * }).catch(function (err) {
 *   console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
 * });
 * ```
 *
 * Inside the callback `this` is the knex transaction object. So if you need to create
 * knex queries you can do this:
 *
 * ```js
 * objection.transaction(Person, function (Person) {
 *  var knex = this;
 *
 *  return Person
 *    .query()
 *    .insert({firstName: 'Jennifer', lastName: 'Lawrence'})
 *    .then(function (jennifer) {
 *      return knex.insert({name: 'Scrappy'}}.into('Animal');
 *    });
 *
 * }).then(function () {
 *   console.log('Jennifer and Scrappy were successfully inserted');
 * }).catch(function (err) {
 *   console.log('Something went wrong. Neither Jennifer nor Scrappy were inserted');
 * });
 * ```
 *
 * @function transaction
 * @returns {Promise}
 */
module.exports = function transaction() {
  // There must be at least one model class and the callback.
  if (arguments.length < 2) {
    return Promise.reject(new Error('objection.transaction: provide at least one Model class to bind to the transaction'));
  }

  // The last argument should be the callback and all other Model subclasses.
  var callback = _.last(arguments);
  var modelClasses = _.take(arguments, arguments.length - 1);
  var i;

  for (i = 0; i < modelClasses.length; ++i) {
    if (!utils.isSubclassOf(modelClasses[i], Model)) {
      return Promise.reject(new Error('objection.transaction: all but the last argument should be Model subclasses'));
    }
  }

  var knex = _.first(modelClasses).knex();
  for (i = 0; i < modelClasses.length; ++i) {
    if (modelClasses[i].knex() !== knex) {
      return Promise.reject(new Error('objection.transaction: all Model subclasses must be bound to the same database'));
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
