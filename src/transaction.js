import _ from 'lodash';
import Promise from 'bluebird';
import Model from './model/Model';
import {isSubclassOf} from './utils/classUtils';

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
 *  let knex = this;
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
export default function transaction() {
  // There must be at least one model class and the callback.
  if (arguments.length < 2) {
    return Promise.reject(new Error('objection.transaction: provide at least one Model class to bind to the transaction'));
  }

  // The last argument should be the callback and all other Model subclasses.
  let callback = _.last(arguments);
  let modelClasses = _.take(arguments, arguments.length - 1);
  let i;

  for (i = 0; i < modelClasses.length; ++i) {
    if (!isSubclassOf(modelClasses[i], Model)) {
      return Promise.reject(new Error('objection.transaction: all but the last argument should be Model subclasses'));
    }
  }

  let knex = _.first(modelClasses).knex();
  for (i = 0; i < modelClasses.length; ++i) {
    if (modelClasses[i].knex() !== knex) {
      return Promise.reject(new Error('objection.transaction: all Model subclasses must be bound to the same database'));
    }
  }

  // If the function is a generator, wrap it using Promise.coroutine.
  if (isGenerator(callback)) {
    callback = Promise.coroutine(callback);
  }

  return knex.transaction(trx => {
    for (let i = 0; i < modelClasses.length; ++i) {
      modelClasses[i] = modelClasses[i].bindTransaction(trx);
    }

    return Promise.try(() => {
      return callback.apply(trx, modelClasses);
    });
  });
}

/**
 * Starts a transaction.
 *
 * The returned promise is resolved with a knex transaction object that can be used as
 * a query builder. You can bind `Model` classes to the transaction using the `Model.bindTransaction`
 * method. The transaction object has `commit` and `rollback` methods for committing and
 * rolling back the transaction.
 *
 * ```js
 * let Person = require('./models/Person');
 * let transaction;
 *
 * objection.transaction.start(Person).then(function (trx) {
 *   transaction = trx;
 *   return Person
 *     .bindTransaction(transaction)
 *     .query()
 *     .insert({firstName: 'Jennifer'});
 * }).then(function (jennifer) {
 *   return Person
 *     .bindTransaction(transaction)
 *     .query()
 *     .patch({lastName: 'Lawrence'})
 *     .where('id', jennifer.id);
 * }).then(function () {
 *   return transaction.commit();
 * }).catch(function () {
 *   return transaction.rollback();
 * });
 * ```
 *
 * @param {Class.<Model>|knex} modelClassOrKnex
 *    A knex instance or any model that has a knex connection set. Note that you can bind any model
 *    to the created transaction regardless of the model given to this method. This argument is used
 *    only to get a knex connection for starting the transaction.
 *
 * @returns {Promise}
 */
transaction.start = function (modelClassOrKnex) {
  let knex = modelClassOrKnex;

  if (isSubclassOf(modelClassOrKnex, Model)) {
    knex = modelClassOrKnex.knex();
  }

  if (!_.isFunction(knex.transaction)) {
    return Promise.reject(new Error('objection.transaction.start: first argument must be a model class or a knex instance'));
  }

  return new Promise((resolve, reject) => {
    knex.transaction(trx => {
      resolve(trx);
    }).catch(err => {
      reject(err);
    });
  });
};

function isGenerator(fn) {
  return fn && fn.constructor && fn.constructor.name === 'GeneratorFunction';
}
